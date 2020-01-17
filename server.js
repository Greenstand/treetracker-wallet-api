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

 
  const query = {
    text: `SELECT *
    FROM token
    WHERE entity_id = $1`,
    values: [walletEntityId]
  }
  const rval = await pool.query(query);

  const trees = [];
  for(i=0; i<rval.rows.length; i++){
    treeItem = {
      token: rval.rows[i].uuid,
      map_url: "https://treetracker.org?treeid="+rval.rows[i].tree_id,
      image_url: "not implemented",
      meta: "map url is hard coded to live map"
    }
    trees.push(treeItem);
  }
  const response = {
    trees: trees,
    wallet: wallet,
    wallet_url: "https://dev.treetracker.org/?wallet="+wallet
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
    WHERE id = $1`,
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
  accounts.push(accountData);

  for(const childEntity of childEntities){
    const childAccountData = renderAccountData(childEntity);
    childAccountData.access = 'child';
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
    (name, first_name, last_name, email, phone, website, wallet)
    values
    ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    values: [body.name, body.first_name, body.last_name, body.email, body.phone, body.website, body.wallet]
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


app.post('/transfer', asyncHandler(async (req, res, next) => {

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

  // TODO: validate inputs
  const tokens = req.body.tokens;
  const receiverWallet = req.body.receiver_wallet;

  const queryWallet = {
    text: `SELECT *
    FROM entity
    WHERE wallet = $1`,
    values: [receiverWallet]
  }
  const rvalWallet = await pool.query(queryWallet);
  receiverEntityId = rvalWallet.rows[0].id;

  // validate tokens
  const query = {
    text: `SELECT entity_id, count(id)
    FROM token
    WHERE uuid = ANY ($1)
    GROUP BY entity_id`,
    values: [tokens]
  }
  const rval = await pool.query(query);
  if(rval.rows.length != 1){
    res.status(403).json({
      message:"Tokens must be non-empty and all be held by the same entity"
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


  console.log(tokenReport);
  if(tokenReport.entity_id != entityId){
    // check if this is a valid subaccount
    const managementAccountQuery = {
      text: `SELECT *
      FROM entity_manager
      WHERE child_entity_id = $1`,
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
  


  const response = {status: "ok - transfer log not implemented yet"}
  res.status(200).json(response);
  res.end();

}));


app.post('/send', asyncHandler(async (req, res, next) => {
  // not implemented, for sending externally
}));

app.get('*',function(req, res){
    res.sendFile(path.join(__dirname,'index.html'));
});

app.listen(port,()=>{
    console.log('listening on port ' + port);
});

module.exports = app;
