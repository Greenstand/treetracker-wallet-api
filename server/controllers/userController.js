const userController = {};
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const config = require('../../config/config.js');
const log = require("loglevel");
log.setLevel("debug");

/* ________________________________________________________________________
 * Get all trees currently in the logged in account's default wallet,
 * or all trees in each managed sub-account wallets.
 * ________________________________________________________________________
*/
userController.getTrees = async (req, res, next) => {
  log.debug("getTree");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next({
      log: 'Error: Invalid wallet or limit format',
      status: 422,
      message: { err: errors.array() },
    });
  }
  let { wallet } = req.query;
  const entityId = res.locals.entity_id;
  let walletEntityId = entityId;

  if (wallet != null) {
    console.log(wallet);

    // verify this user has access to this wallet
    const query1 = {
      text: `SELECT *
      FROM entity 
      WHERE wallet = $1`,
      values: [wallet],
    };

    const rval1 = await pool.query(query1);

    if (rval1.rows.length === 0) {
      next({
        log: 'Error: Invalid wallet',
        status: 404,
        message: { err: 'Error: invalid wallet' },
      });
    }
    walletEntityId = rval1.rows[0].id;
  } else {
    const query2 = {
      text: `SELECT *
      FROM entity 
      WHERE id = $1`,
      values: [walletEntityId],
    };
    const rval2 = await pool.query(query2);
    wallet = rval2.rows[0].wallet;
  }

  const limitClause = req.query.limit ? `LIMIT ${req.query.limit}` : ' ';
  const query3 = {
    text: `SELECT token.*, image_url, lat, lon, 
    tree_region.name AS region_name, 
    trees.time_created AS tree_captured_at
    FROM token
    JOIN trees
    ON trees.id = token.tree_id
    LEFT JOIN (
      SELECT DISTINCT name, tree_id
      FROM tree_region
      JOIN region
      ON region.id = tree_region.region_id
      WHERE zoom_level = 4
    ) tree_region
    ON tree_region.tree_id = trees.id 
    WHERE entity_id = $1
    ORDER BY tree_captured_at DESC
    ${limitClause}`,
    values: [walletEntityId],
  };
  log.debug("pg:", query3.text, query3.values);
  const rval3 = await pool.query(query3);

  const trees = [];
  if (rval3.rows.length !== 0) {
    /*eslint-disable*/
    for (token of rval3.rows) {
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
  } 
  const response = {
    trees: trees,
    wallet: wallet,
    wallet_url: config.wallet_url + "?wallet="+wallet
  };
  res.locals.trees = response;
  next();
};

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

  const renderAccountData = (entity) => {
    console.log(entity);
    let accountData = {
      type: entity.type, 
      wallet: entity.wallet,
      email: entity.email,
      phone: entity.phone
    };
    if (entity.type == 'p') {
      accountData.first_name = entity.first_name;
      accountData.last_name = entity.last_name;
    } else if (entity.type == 'o') {
      accountData.name = entity.name;
    }
    return accountData;
  };

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

module.exports = userController;
