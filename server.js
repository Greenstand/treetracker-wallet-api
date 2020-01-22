const express = require('express');
const Sentry = require('@sentry/node');
const bearerToken = require('express-bearer-token');
const bodyParser = require('body-parser');
const http = require('http');
const pg = require('pg');
const { Pool, Client } = require('pg');
const path = require('path');
const JWT = require('jsonwebtoken');
const Crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const FS = require('fs');

const config = require('./config/config');

// PRIVATE and PUBLIC key
const privateKEY  = FS.readFileSync('./config/private.key', 'utf8');
const publicKEY  = FS.readFileSync('./config/public.key', 'utf8');

const signingOptions = {
 issuer: "greenstand",
 expiresIn:  "365d",
 algorithm:  "RS256"
};

const verifyOptions = {
 issuer: "greenstand",
 expiresIn:  "365d",
 algorithms:  ["RS256"]
};

const pool = new Pool({
  connectionString: config.connectionString
});

pool.on('connect', (client) => {
  //console.log("connected", client);
})

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();
const port = process.env.NODE_PORT || 3006;

const sha512 = function(password, salt){
    var hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return value;
};

const checkAccess = async function(entityId, roleName){

  const query = {
    text: `SELECT *
    FROM entity_role
    WHERE entity_id = $1
    AND role_name = $2
    AND enabled = TRUE`,
    values: [entityId, roleName]
  }
  const rval = await pool.query(query);

  return rval.rows.length == 1;

}


Sentry.init({ dsn: config.sentry_dsn });

app.use(Sentry.Handlers.requestHandler());
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});


app.set('view engine','html');

app.use(asyncHandler(async (req, res, next) => {

  if (!req.headers['treetracker-api-key'] ) {
    console.log('ERROR: Invalid access - no key');
    res.status(406).send('Error: Invalid access');
    res.end();
    return;
  }

  const apiKey = req.headers['treetracker-api-key'];

  const query = {
    text: `SELECT *
    FROM api_key
    WHERE key = $1
    AND tree_token_api_access`,
    values: [apiKey]
  }
  const rval = await pool.query(query);

  if(rval.rows.length == 0){
    console.log('ERROR: Authentication, invalid access');
    res.status(401).send('Error: Invalid access');
    res.end();
    return;
  }

  console.log("Valid Access");
  next();
 
}));

app.post('/auth', asyncHandler(async (req, res, next) => {
  if (!req.body || (!req.body['wallet'] || !req.body['password'] )) {
    console.log('ERROR: Authentication, no credentials submitted');
    res.status(406).send('Error: No credentials submitted 1');
    res.end();
    return;
  }

  const wallet = req.body['wallet'];
  const password = req.body['password'];

  // Now check for wallet/password
  const query2 = {
    text: `SELECT *
    FROM entity
    WHERE wallet = $1
    AND password IS NOT NULL`,
    values: [wallet]
  }
  console.log(query2);
  const rval2 = await pool.query(query2);

  if(rval2.rows.length == 0){
    console.log('ERROR: Authentication, invalid credentials');
    res.status(401).send('Error: Invalid credentials');
    res.end();
    return;
  } 

  const entity = rval2.rows[0];
  const hash = sha512(password, entity.salt);
  console.log(hash);

  if(hash != entity.password){
    console.log('ERROR: Authentication, invalid credentials');
    res.status(401).send('Error: Invalid credentials');
    res.end();
    return;
  }


  const payload = {
    id: entity.id
  };
  const jwt = JWT.sign(payload, privateKEY, signingOptions);
  res.status(200).json({"token": jwt});
  return;

}));

// middleware layer that checks jwt authentication

app.use(bearerToken());
app.use((req, res, next)=>{
  // check header or url parameters or post parameters for token
  var token = req.token;
  if(token){
    //Decode the token
    JWT.verify(token, publicKEY, verifyOptions, (err,decod)=>{
      if(err){
        console.log(err);
        console.log('ERROR: Authentication, token  not verified');
        res.status(403).json({
          message:"Wrong Token"
        });
      }
      else{
        req.payload = decod;
        req.entity_id = decod.id;
        next();
      }
    });
  }
  else{
    console.log('ERROR: Authentication, no token supplied for protected path');
    res.status(403).json({
      message:"No Token"
    });
  }
});

app.get('/tree', asyncHandler(async (req, res, next) => {

  const entityId = req.entity_id;

  const accessGranted = await checkAccess(entityId, 'list_trees');
  if( !accessGranted ){
    res.status(401).json({
      message:"Not Permitted"
    });
    return;
  }

  var walletEntityId = entityId;
  var wallet = req.query.wallet;
  if(wallet != null){
    console.log(wallet);

    const query1 = {
      text: `SELECT *
      FROM entity 
      WHERE wallet = $1`,
      values: [wallet]
    }
    const rval1 = await pool.query(query1);
    walletEntityId = rval1.rows[0].id;

  } else {

    const query1 = {
      text: `SELECT *
      FROM entity 
      WHERE id = $1`,
      values: [walletEntityId]
    }
    const rval1 = await pool.query(query1);
    wallet = rval1.rows[0].wallet;

  }


  var limitSQL = "";
  const limit = req.query.limit;
  if(limit != null){
    limitClause = `LIMIT ${limit}`
  }
  
 
  const query = {
    text: `SELECT token.*, image_url, lat, lon, 
    tree_region.name AS region_name,
    trees.time_created AS tree_captured_at
    FROM token
    JOIN trees
    ON trees.id = token.tree_id
    LEFT JOIN (
      SELECT DISTINCT  name, tree_id
      FROM tree_region
      JOIN region
      ON region.id = tree_region.region_id
      WHERE zoom_level = 4
    ) tree_region
    ON tree_region.tree_id = trees.id 
    WHERE entity_id = $1
    ORDER BY tree_captured_at DESC 
    ${limitClause}`,
    values: [walletEntityId]
  }
  const rval = await pool.query(query);

  const trees = [];
  for(token of rval.rows){
    treeItem = {
      token: token.uuid,
      map_url: config.map_url + "?treeid="+token.tree_id,
      image_url: token.image_url,
      tree_captured_at: token.tree_captured_at,
      latitude: token.lat,
      longitude: token.lon,
      region: token.region_name
    }
    trees.push(treeItem);
  }
  const response = {
    trees: trees,
    wallet: wallet,
    wallet_url: config.wallet_url + "?wallet="+wallet
  }

  res.status(200).json(response);
  res.end();

}));

const renderAccountData = function(entity){
  console.log(entity);
  accountData = {
    type: entity.type, 
    wallet: entity.wallet,
    email: entity.email,
    phone: entity.phone
  };
  if(entity.type == 'p'){
    accountData.first_name = entity.first_name;
    accountData.last_name = entity.last_name;
  } else if (entity.type == 'o'){
    accountData.name = entity.name;
  }
  return accountData;
}


app.get('/history', asyncHandler(async (req, res, next) => {

  const entityId = req.entity_id;
  const accessGranted = await checkAccess(entityId, 'list_trees');
  if( !accessGranted ){
    res.status(401).json({
      message:"Not Permitted"
    });
    return;
  }


  const tokenUUID = req.query.token;
  const query0 = {
    text: `SELECT *
    FROM token 
    WHERE uuid = $1`,
    values: [tokenUUID]
  }
  const rval0 = await pool.query(query0);
  const token = rval0.rows[0];


  // check that we manage the wallet this token is in

  // get primary account
  const query1 = {
    text: `SELECT *
    FROM entity 
    LEFT JOIN (
      SELECT entity_id, COUNT(id) AS tokens_in_wallet
      FROM token
      GROUP BY entity_id
    ) balance
    ON balance.entity_id = entity.id
    WHERE entity.id = $1`,
    values: [entityId]
  }
  const rval1 = await pool.query(query1);
  const entity = rval1.rows[0];
  const managedWallets = [entity.id];

  // get any child accounts
  if( await checkAccess(entityId, 'manage_accounts') ){
    const query2 = {
      text: `SELECT *
      FROM entity 
      JOIN entity_manager
      ON entity_manager.child_entity_id = entity.id
      WHERE entity_manager.parent_entity_id = $1
      AND entity_manager.active = TRUE`,
      values: [entityId]
    }
    const rval2 = await pool.query(query2);
    const entityManagers = rval2.rows;
    for(entityManager of entityManagers){
      managedWallets.push(entityManager.child_entity_id);
    }

  }
  console.log(managedWallets);


  if(!managedWallets.includes(token.entity_id)){
    res.status(401).json({
      message:"You do not have access to history for this tree"
    });
    return;
  }


  const query4 = {
    text: `SELECT '${tokenUUID}' as token,
    sender.wallet as sender_wallet,
    receiver.wallet as receiver_wallet,
    processed_at
    FROM transaction
    JOIN entity sender
    ON sender.id = transaction.sender_entity_id
    JOIN entity receiver
    ON receiver.id = transaction.receiver_entity_id
    WHERE token_id = $1
    ORDER BY processed_at`,
    values: [token.id]
  }
  const rval4 = await pool.query(query4);
  const history = [];  
  for(transaction of rval4.rows){
    history.push(transaction);
  }

  const response = {
    history: history
  };
  res.status(200).json(response);
  res.end();

}));



app.get('/account', asyncHandler(async (req, res, next) => {

  const entityId = req.entity_id;
  const accessGranted = await checkAccess(entityId, 'accounts');
  if( !accessGranted ){
    res.status(401).json({
      message:"Not Permitted"
    });
    return;
  }


  // get primary account
  const query1 = {
    text: `SELECT *
    FROM entity 
    LEFT JOIN (
      SELECT entity_id, COUNT(id) AS tokens_in_wallet
      FROM token
      GROUP BY entity_id
    ) balance
    ON balance.entity_id = entity.id
    WHERE entity.id = $1`,
    values: [entityId]
  }
  const rval1 = await pool.query(query1);
  const entity = rval1.rows[0];


  // get any child accounts

  const query2 = {
    text: `SELECT *
    FROM entity 
    JOIN entity_manager
    ON entity_manager.child_entity_id = entity.id
    WHERE entity_manager.parent_entity_id = $1
    AND entity_manager.active = TRUE`,
    values: [entityId]
  }
  const rval2 = await pool.query(query2);
  const childEntities = rval2.rows;


  // create response json
  const accounts = [];
  const accountData = renderAccountData(entity);
  accountData.access = 'primary';
  accountData.tokens_in_wallet = entity.tokens_in_wallet ? entity.tokens_in_wallet : 0;
  accounts.push(accountData);

  for(const childEntity of childEntities){
    const childAccountData = renderAccountData(childEntity);
    childAccountData.access = 'child';
    childAccountData.tokens_in_wallet = childEntity.tokens_in_wallet ? childEntity.tokens_in_wallet : 0;
    accounts.push(childAccountData);
  }

  const response = {
    accounts: accounts
  };
  res.status(200).json(response);
  res.end();

}));

app.post('/account', asyncHandler(async (req, res, next) => {

  console.log('ok');
  const entityId = req.entity_id;
  const accessGranted = await checkAccess(entityId, 'manage_accounts');
  if( !accessGranted ){
    res.status(401).json({
      message:"Not Permitted"
    });
    return;
  }
  console.log('ok');

  const body = req.body;
  console.log(body);

  //TODO: wallet cannot already exist in database.  unique index blocks this in database, but check here also

  //TODO: these should occur in a transaction
  const query1 = {
    text: `INSERT INTO entity
    (type, name, first_name, last_name, email, phone, website, wallet)
    values
    ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    values: ['p', body.name, body.first_name, body.last_name, body.email, body.phone, body.website, body.wallet]
  }
  const rval1 = await pool.query(query1);
  const subAccount = rval1.rows[0];
  const accountData = renderAccountData(subAccount);
  accountData.access = 'child';

  const query2 = {
    text: `INSERT INTO entity_manager
    (parent_entity_id, child_entity_id, active)
    values
    ($1, $2, true)
    RETURNING *`,
    values: [entityId, subAccount.id]
  }
  const rval2 = await pool.query(query2);


  res.status(200).json(accountData);
  res.end();

}));

app.post('/transfer/bundle', asyncHandler(async (req, res, next) => {

  console.log('Bundle transfer requested');

  const entityId = req.entity_id;

  {
    const accessGranted = await checkAccess(entityId, 'transfer_bundle');
    if( !accessGranted ){
      res.status(401).json({
        message:"Not Permitted"
      });
      return;
    }
  }

  {
    const accessGranted = await checkAccess(entityId, 'manage_accounts');
    if( !accessGranted ){
      res.status(401).json({
        message:"Not Permitted"
      });
      return;
    }
  }

  console.log("Role access approved");

  const bundleSize = req.body.bundle_size;
  const senderWallet = req.body.sender_wallet;
  const receiverWallet = req.body.receiver_wallet;

  // Get sender entity id

  const queryWallet1 = {
    text: `SELECT *
    FROM entity
    WHERE wallet = $1`,
    values: [senderWallet]
  }
  const rvalWallet1 = await pool.query(queryWallet1);
  const senderEntityId = rvalWallet1.rows[0].id;


  const queryWallet2 = {
    text: `SELECT *
    FROM entity
    WHERE wallet = $1`,
    values: [receiverWallet]
  }
  const rvalWallet2 = await pool.query(queryWallet2);
  receiverEntityId = rvalWallet2.rows[0].id;

  if(receiverEntityId == senderEntityId){
    res.status(403).json({
      message:"Sender and receiver are identical"
    });
    return;
  }

  // Check access to sender and receiver wallets

  if(senderEntityId != entityId){
    // check if this is a valid subaccount
    const managementAccountQuery = {
      text: `SELECT *
      FROM entity_manager
      WHERE child_entity_id = $1
      AND entity_manager.active = TRUE`,
      values: [senderEntityId]
    };      
    const managementRval = await pool.query(managementAccountQuery);
    var managed = false
    if(managementRval.rows.length > 0){
      for(r of managementRval.rows){
        if(r.parent_entity_id == entityId){
          managed = true;
          break;
        }
      }
    }

    if(managed == false){
      res.status(401).json({
        message:"You do not manage the sender of this transfer"
      });
      return;
    }
  }


  if(receiverEntityId != entityId){
    // check if this is a valid subaccount
    const managementAccountQuery = {
      text: `SELECT *
      FROM entity_manager
      WHERE child_entity_id = $1
      AND entity_manager.active = TRUE`,
      values: [receiverEntityId]
    };      
    const managementRval = await pool.query(managementAccountQuery);
    var managed = false
    if(managementRval.rows.length > 0){
      for(r of managementRval.rows){
        if(r.parent_entity_id == entityId){
          managed = true;
          break;
        }
      }
    }

    if(managed == false){
      res.status(401).json({
        message:"You do not manage the receiver of this transfer"
      });
      return;
    }
  }



  // Find tokens for this bundle
  const queryTokens = {
    text: `SELECT *
    FROM token
    WHERE entity_id = $1
    ORDER BY id ASC
    LIMIT $2`,
    values: [senderEntityId, bundleSize]
  }
  const rvalTokens = await pool.query(queryTokens);
  const tokens = rvalTokens.rows; 
  
  if(tokens.length != bundleSize){
    res.status(422).json({
      message:"Not enough tokens matching bundle description"
    });
    return;
  }

  const tokenUUIDs = [];
  for(token of tokens){
    tokenUUIDs.push(token.uuid);
  }


  // move tokens
  const query2 = {
    text: `UPDATE token
    SET entity_id = $1
    WHERE uuid = ANY ($2)`,
    values : [receiverEntityId, tokenUUIDs]
  }
  const rval2 = await pool.query(query2);

  const response = {
    status: `${tokens.length} tokens transferred to ${receiverWallet}`,
    wallet_url: config.wallet_url + "?wallet="+receiverWallet
  }
  res.status(200).json(response);
  res.end();

}));



app.post('/transfer', asyncHandler(async (req, res, next) => {

  const entityId = req.entity_id;
  const accessGranted = await checkAccess(entityId, 'manage_accounts');
  if( !accessGranted ){
    res.status(401).json({
      message:"Not Permitted"
    });
    return;
  }

  // TODO: validate inputs
  const tokens = req.body.tokens;
  const senderWallet = req.body.sender_wallet;
  const receiverWallet = req.body.receiver_wallet;

  const queryWallet = {
    text: `SELECT *
    FROM entity
    WHERE wallet = $1`,
    values: [receiverWallet]
  }
  const rvalWallet = await pool.query(queryWallet);
  const receiverEntityId = rvalWallet.rows[0].id;

  const queryWallet2 = {
    text: `SELECT *
    FROM entity
    WHERE wallet = $1`,
    values: [senderWallet]
  }
  const rvalWallet2 = await pool.query(queryWallet2);
  const senderEntityId = rvalWallet2.rows[0].id;

  // validate tokens
  const query = {
    text: `SELECT entity_id, count(id)
    FROM token
    WHERE uuid = ANY ($1)
    AND entity_id = $2
    GROUP BY entity_id`,
    values: [tokens, senderEntityId]
  }
  const rval = await pool.query(query);
  if(rval.rows.length != 1){
    res.status(403).json({
      message:"Tokens must be non-empty and all be held by the sender wallet"
    });
    return;
  }
  const tokenReport = rval.rows[0];

  if(receiverEntityId == tokenReport.entity_id){
    res.status(403).json({
      message:"Sender and receiever are identical"
    });
    return;
  }


  if(tokenReport.entity_id != entityId){
    // check if this is a valid subaccount
    const managementAccountQuery = {
      text: `SELECT *
      FROM entity_manager
      WHERE child_entity_id = $1
      AND entity_manager.active = TRUE`,
      values: [tokenReport.entity_id]
    };      
    const managementRval = await pool.query(managementAccountQuery);
    var managed = false
    if(managementRval.rows.length > 0){
      for(r of managementRval.rows){
        if(r.parent_entity_id == entityId){
          managed = true;
          break;
        }
      }
    }

    if(managed == false){
      res.status(401).json({
        message:"You do not manage the holder of these tokens"
      });
      return;
    }
  }

  if(receiverEntityId != entityId){

    const managementAccountQuery = {
      text: `SELECT *
      FROM entity_manager
      WHERE child_entity_id = $1`,
      values: [receiverEntityId]
    };      
    const managementRval = await pool.query(managementAccountQuery);
    var managed = false
    console.log(managementRval.rows);
    if(managementRval.rows.length > 0){
      for(r of managementRval.rows){
        if(r.parent_entity_id == entityId){
          managed = true;
          break;
        }
      }
    }

    if(managed == false){
      res.status(401).json({
        message:"You do not manage the receiver for this transfer"
      });
      return;
    }

  }



  // todo: start a db transaction 
  // create a transfer
  const query1 = {
    text: `INSERT INTO transfer  
    (executing_entity_id)
    values
    ($1)
    RETURNING *`,
    values: [entityId]
  }
  const rval1 = await pool.query(query1);
  const transferId = rval1.rows[0].id;


  //TODO use a stored procedure to populate the transfer_id on the transaction records
  // or explore other ways of doing this
  // such as flipping the trigger.. so that instead of an update we process a transfer, and this moves the token.. is that good?

  // move tokens
  const query2 = {
    text: `UPDATE token
    SET entity_id = $1
    WHERE uuid = ANY ($2)`,
    values : [receiverEntityId, tokens]
  }
  const rval2 = await pool.query(query2);

  // get transfer log
  


  const response = {
    status: `${tokens.length} tokens transferred to ${receiverWallet}`,
    wallet_url: config.wallet_url + "?wallet="+receiverWallet
  }
  res.status(200).json(response);
  res.end();

}));


app.post('/send', asyncHandler(async (req, res, next) => {
  // not implemented, for sending externally
}));

app.get('*',function(req, res){
  console.log('Did not match path');
});

app.post('*',function(req, res){
  console.log('Did not match path');
});

app.listen(port,()=>{
    console.log('listening on port ' + port);
});

module.exports = app;
