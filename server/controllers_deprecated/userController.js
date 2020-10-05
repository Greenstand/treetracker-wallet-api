const userController = {};
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const config = require('../../config/config.js');
const log = require("loglevel");
const assert = require("assert");

/* ________________________________________________________________________
 * Get all trees currently in the logged in account's default wallet,
 * or all trees in each managed sub-account wallets.
 * ________________________________________________________________________
*/
// userController.getTrees = async (req, res, next) => {
//   log.debug("getTree");
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     next({
//       log: 'Error: Invalid wallet or limit format',
//       status: 422,
//       message: { err: errors.array() },
//     });
//   }
//   let { wallet } = req.query;
//   const entityId = res.locals.entity_id;
//   let walletEntityId = entityId;

//   if (wallet != null) {
//     console.log(wallet);

//     // verify this user has access to this wallet
//     const query1 = {
//       text: `SELECT *
//       FROM entity 
//       WHERE wallet = $1`,
//       values: [wallet],
//     };

//     const rval1 = await pool.query(query1);

//     if (rval1.rows.length === 0) {
//       next({
//         log: 'Error: Invalid wallet',
//         status: 404,
//         message: { err: 'Error: invalid wallet' },
//       });
//     }
//     walletEntityId = rval1.rows[0].id;
//   } else {
//     const query2 = {
//       text: `SELECT *
//       FROM entity 
//       WHERE id = $1`,
//       values: [walletEntityId],
//     };
//     const rval2 = await pool.query(query2);
//     wallet = rval2.rows[0].wallet;
//   }

//   const limitClause = req.query.limit ? `LIMIT ${req.query.limit}` : ' ';
//   const query3 = {
//     text: `SELECT token.*, image_url, lat, lon, 
//     tree_region.name AS region_name, 
//     trees.time_created AS tree_captured_at
//     FROM token
//     JOIN trees
//     ON trees.id = token.tree_id
//     LEFT JOIN (
//       SELECT DISTINCT name, tree_id
//       FROM tree_region
//       JOIN region
//       ON region.id = tree_region.region_id
//       WHERE zoom_level = 4
//     ) tree_region
//     ON tree_region.tree_id = trees.id 
//     WHERE entity_id = $1
//     ORDER BY tree_captured_at DESC
//     ${limitClause}`,
//     values: [walletEntityId],
//   };
//   log.debug("pg:", query3.text, query3.values);
//   const rval3 = await pool.query(query3);

//   const trees = [];
//   if (rval3.rows.length !== 0) {
//     /*eslint-disable*/
//     for (token of rval3.rows) {
//       treeItem = {
//         token: token.uuid,
//         map_url: config.map_url + "?treeid="+token.tree_id,
//         image_url: token.image_url,
//         tree_captured_at: token.tree_captured_at,
//         latitude: token.lat,
//         longitude: token.lon,
//         region: token.region_name
//       }
//       trees.push(treeItem);
//     }
//   } 
//   const response = {
//     trees: trees,
//     wallet: wallet,
//     wallet_url: config.wallet_url + "?wallet="+wallet
//   };
//   res.locals.trees = response;
//   next();
// };

// const renderAccountData = (entity) => {
//   log.debug(entity);
//   let accountData = {
//     type: entity.type, 
//     wallet: entity.wallet,
//     email: entity.email,
//     phone: entity.phone
//   };
//   if (entity.type == 'p') {
//     accountData.first_name = entity.first_name;
//     accountData.last_name = entity.last_name;
//   } else if (entity.type == 'o') {
//     accountData.name = entity.name;
//   }
//   return accountData;
// };

/* ________________________________________________________________________
 * Get details of logged in account and sub-accounts.
 * ________________________________________________________________________
*/
userController.getAccounts = async (req, res, next) => {
  const entityId = res.locals.entity_id;
  console.log(entityId);
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
  };
  const rval1 = await pool.query(query1);
  const entity = rval1.rows[0];

// get child accounts
  const query2 = {
    text: `SELECT *
    FROM entity 
    JOIN entity_manager
    ON entity_manager.child_entity_id = entity.id
    LEFT JOIN (
      SELECT entity_id, COUNT(id) AS tokens_in_wallet
      FROM token
      GROUP BY entity_id
    ) balance
    ON balance.entity_id = entity_manager.child_entity_id
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

  for (const childEntity of childEntities) {
    const childAccountData = renderAccountData(childEntity);
    childAccountData.access = 'child';
    childAccountData.tokens_in_wallet = childEntity.tokens_in_wallet ? childEntity.tokens_in_wallet : 0;
    accounts.push(childAccountData);
  }

  const response = {
    accounts: accounts
  };
  res.locals.accounts = response;
  next();

};

userController.addAccount = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  const entityId = res.locals.entity_id;
  const body = req.body;

  const queryWallet = {
    text: `SELECT *
    FROM entity 
    WHERE wallet = $1`,
    values: [body.wallet]
  }
  const rvalWallet = await pool.query(queryWallet);
  if(rvalWallet.rows.length > 0){
    res.status(409).json({
      message:"This wallet name is taken. Please select different wallet name"
    });
    return;
  }

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

  const response = {
    accountData,
  };
  res.locals.response = response;
  next();
};


/* ________________________________________________________________________
 * Transfer specific tree tokens between managed accounts
 * ________________________________________________________________________
*/

userController.transfer = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  const entityId = res.locals.entity_id;

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
  res.locals.response = response;
  next();
};

userController.send = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  const entityId = res.locals.entity_id;
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
      msg:"Sender and receiver are identical",
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

  const response = {
    status: `${tokens.length} tokens transferred to ${receiverWallet}`,
    wallet_url: config.wallet_url + "?wallet="+receiverWallet
  }
  res.locals.response = response;
  next();
};

/* ________________________________________________________________________
 * Transfer a number of tree tokens from one managed wallet to another. 
 * The tokens transfered are not individually identified, but rather drawn 
 * from the pool of available tokens in the sending wallet. 
 * ________________________________________________________________________
*/


userController.transferBundle = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  console.log('Bundle transfer requested');

  const entityId = res.locals.entity_id;

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
  res.locals.response = response;
  next();

};

/* ________________________________________________________________________
 * View the transfer history (impact owner custody chain) for a given tree 
 * token that is held by the logged in master account or sub-accounts.
 * ________________________________________________________________________
*/

userController.history = async (req, res, next) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
     return res.status(422).json({ errors: errors.array() });
  }

  const entityId = res.locals.entity_id;

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
//  res.status(200).json(response);
//  res.end();
  res.locals.response = response;
  next();

}

userController.token = async (req, res, next) => {

  const {uuid} = req.params;

  if (!uuid) {
    next({
      log: 'ERROR: No token supplied',
      status: 401,
      message: { err: 'ERROR: No token supplied' },
    });
  }

  const query = {
    text: `SELECT token.*, image_url, lat, lon, 
    tree_region.name AS region_name,
    trees.time_created AS tree_captured_at
    FROM token
    JOIN public.trees AS trees
    ON trees.id = token.tree_id
    LEFT JOIN (
      SELECT DISTINCT  name, tree_id
      FROM public.tree_region AS tree_region
      JOIN public.region AS region
      ON region.id = tree_region.region_id
      WHERE zoom_level = 4
    ) tree_region
    ON tree_region.tree_id = trees.id 
    WHERE token.uuid = $1`,
    values: [uuid]
  }
  log.debug(query);
  const rval = await pool.query(query);

  const trees = [];
  for(let token of rval.rows){
    let treeItem = {
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
    tokens: trees,
  };
  res.locals.response = response;
  next();
}

module.exports = userController;
