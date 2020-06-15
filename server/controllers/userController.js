const userController = {};
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const config = require('../../config/config.js');


userController.getTrees = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next({
      log: 'Error: Invalid wallet or limit format',
      status: 422,
      message: { err: errors.array() },
    });
  }
  let { wallet } = req.query;
  const entityId = req.entity_id;
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

  const limitClause = req.query.limit !== null ? `LIMIT ${req.query.limit}` : '';

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
  const rval3 = await pool.query(query3);

  /*eslint-disable*/
  const trees = [];
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
  const response = {
    trees: trees,
    wallet: wallet,
    wallet_url: config.wallet_url + "?wallet="+wallet
  };
  res.locals.trees = response;
  next();
}


module.exports = userController;