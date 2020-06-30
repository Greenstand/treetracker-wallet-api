const express = require('express');
const Sentry = require('@sentry/node');
const bodyParser = require('body-parser');
const http = require('http');
const pg = require('pg');
const pool = require('./database/database.js');
const router = require('./routes/router.js')
const authController = require('./controllers/authController.js');

const path = require('path');
const asyncHandler = require('express-async-handler');
const { check, validationResult } = require('express-validator');
const { body } = require('express-validator');


const app = express();
const port = process.env.NODE_PORT || 3006;

const config = require('../config/config.js');

Sentry.init({ dsn: config.sentry_dsn });

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

app.use('/', router);

// Global error handler
app.use((err, req, res, next) => {
  const defaultErr = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    message: { err: 'An error occured' },
  };
  // replaces the errorObj with custom returned err from middleware
  const errorObj = { ...defaultErr, ...err };
  return res.status(errorObj.status).json(errorObj.message.err);
});


app.set('view engine','html');




app.get('/history',[
  check('token').isUUID()
], asyncHandler(async (req, res, next) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }
  
  const entityId = req.entity_id;
  const accessGranted = await checkAccess(entityId, 'list_trees');
  if( !accessGranted ){
    res.status(401).json([{
      msg:"Not Permitted",
      param: "list threes",
      location:"access_control"
    }]);
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

  if(token == null){
    res.status(404).json ({
      message:"Token Not Found"
   })
   return;
  }


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



// app.get('/account', asyncHandler(async (req, res, next) => {

//   const entityId = req.entity_id;
//   const accessGranted = await checkAccess(entityId, 'accounts');
//   if( !accessGranted ){
//     res.status(401).json([{
//       msg:"Not Permitted",
//       param: "accounts",
//       location:"access_control"
//     }]);
//     return;
//   }


//   // get primary account
//   const query1 = {
//     text: `SELECT *
//     FROM entity 
//     LEFT JOIN (
//       SELECT entity_id, COUNT(id) AS tokens_in_wallet
//       FROM token
//       GROUP BY entity_id
//     ) balance
//     ON balance.entity_id = entity.id
//     WHERE entity.id = $1`,
//     values: [entityId]
//   }
//   const rval1 = await pool.query(query1);
//   const entity = rval1.rows[0];


//   // get any child accounts

//   const query2 = {
//     text: `SELECT *
//     FROM entity 
//     JOIN entity_manager
//     ON entity_manager.child_entity_id = entity.id
//     LEFT JOIN (
//       SELECT entity_id, COUNT(id) AS tokens_in_wallet
//       FROM token
//       GROUP BY entity_id
//     ) balance
//     ON balance.entity_id = entity_manager.child_entity_id
//     WHERE entity_manager.parent_entity_id = $1
//     AND entity_manager.active = TRUE`,
//     values: [entityId]
//   }
//   const rval2 = await pool.query(query2);
//   const childEntities = rval2.rows;


//   // create response json
//   const accounts = [];
//   const accountData = renderAccountData(entity);
//   accountData.access = 'primary';
//   accountData.tokens_in_wallet = entity.tokens_in_wallet ? entity.tokens_in_wallet : 0;
//   accounts.push(accountData);

//   for(const childEntity of childEntities){
//     const childAccountData = renderAccountData(childEntity);
//     childAccountData.access = 'child';
//     childAccountData.tokens_in_wallet = childEntity.tokens_in_wallet ? childEntity.tokens_in_wallet : 0;
//     accounts.push(childAccountData);
//   }

//   const response = {
//     accounts: accounts
//   };
//   res.status(200).json(response);
//   res.end();

// }));


app.post('/transfer/bundle', [

    check('bundle_size','Invaid bundle numbers').isNumeric()

], asyncHandler(async (req, res, next) => {

  const errors = validationResult(req);


  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  console.log('Bundle transfer requested');

  const entityId = req.entity_id;

  {
    const accessGranted = await checkAccess(entityId, 'transfer_bundle');
    if( !accessGranted ){
      res.status(401).json([{
        msg:"Not Permitted",
        param: "transfer bundle",
        location:"access_control"
      }]);
      return;
    }
  }

  {
    const accessGranted = await checkAccess(entityId, 'manage_accounts');
    if( !accessGranted ){
      res.status(401).json([{
        msg:"Not Permitted",
        param: "manage accounts",
        location:"access_control"
      }]);
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



app.post('/transfer', [

    check('tokens[*].*').isUUID(),

    check('sender_wallet', 'Invalid Sender wallet name').isAlphanumeric(),

    check('receiver_wallet', 'Invalid Reciever wallet name').isAlphanumeric()
    
], asyncHandler(async (req, res, next) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  const entityId = req.entity_id;
  const accessGranted = await checkAccess(entityId, 'manage_accounts');
  if( !accessGranted ){
    res.status(401).json([{
      msg:"Not Permitted",
      param: "manage accounts",
      location:"access_control"
    }]);
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

app.get('/token', asyncHandler(async (req, res, next) => {

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
    WHERE uuid = $1`,
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

}));

app.get('/wallet/:wallet_id/event', asyncHandler(async (req, res, next) => {

}));

app.post('/wallet/:wallet_id/trust/request', asyncHandler(async (req, res, next) => {

  const type = req.body.type;
  //const requestor_wallet_id = req.body.wallet_id; this is in the bearer token
  const requested_wallet_id = req.params.wallet_id;


}));

app.post('/wallet/:wallet_id/trust/approve',  asyncHandler(async (req, res, next) => {

  const type = req.body.type;
  //const wallet_id = req.body.wallet_id; // in the bearer token
  const approved_wallet_id = req.params.wallet_id;

}));


app.post('/send', [

  check('tokens[*].*').isUUID(),

  check('receiver_wallet', 'Invalid Reciever wallet name').isAlphanumeric()
  
], asyncHandler(async (req, res, next) => {
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  const entityId = req.entity_id;
  // check for trust connection here

  const tokens = req.body.tokens;
  const receiverWallet = req.body.receiver_wallet;
  const senderEntityId = entityId

  // this code is copied from /transfer and needs to be refactored in to a model
  const queryWallet = {
    text: `SELECT *
    FROM entity
    WHERE wallet = $1`,
    values: [receiverWallet]
  }
  const rvalWallet = await pool.query(queryWallet);
  const receiverEntityId = rvalWallet.rows[0].id;

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
    res.status(403).json([{
      msg:"Tokens must be non-empty and all be held by the sender wallet",
      param: "tokens",
      location:"send"
    }]);
    return;
  }
  const tokenReport = rval.rows[0];

  if(receiverEntityId == tokenReport.entity_id){
    res.status(403).json([{
      msg:"Sender and receiever are identical",
      param: "receiver_wallet",
      location:"send"
    }]);
    return;
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

app.get('*',function(req, res){
  console.log('Did not match path', req.originalUrl);
});

app.post('*',function(req, res){
  console.log('Did not match path', req.originalUrl);
});



app.listen(port,()=>{
    console.log('listening on port ' + port);
});

module.exports = app; 



// error from the API . We need to check and add error on those when you put wrong token to the postman
// error was with POST acccount
