const authController = {};
const JWT = require('jsonwebtoken');
const Crypto = require('crypto');
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const FS = require('fs');
const log = require("loglevel");
const path = require("path");
log.setLevel("debug");
const JWTModel = require("../models/auth/JWTModel");

// PRIVATE and PUBLIC key
console.warn("__dirname:", __dirname);
const privateKEY = FS.readFileSync(path.resolve(__dirname, '../../config/jwtRS256.key'), 'utf8');
const publicKEY = FS.readFileSync(path.resolve(__dirname, '../../config/jwtRS256.key.pub'), 'utf8');

const signingOptions = {
  issuer: "greenstand",
  expiresIn:  "365d",
  algorithm:  "RS256",
};

const verifyOptions = {
  issuer: "greenstand",
  expiresIn:  "365d",
  algorithms:  ["RS256"],
};

const sha512 = (password, salt) => {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};

/* ________________________________________________________________________
 * Authorization Route - checks wallet and password credentials
 * ________________________________________________________________________
*/


authController.authorize = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next({
      log: 'Error: Invalid credential format',
      status: 422,
      message: { err: errors.array() },
    });
  }
  if (!req.body || (!req.body.wallet || !req.body.password )) {
    console.log('ERROR: Authentication, no credentials submitted');
    next({
      log: 'Error: No credentials submitted',
      status: 406,
      message: { err: 'Error: No credentials submitted' },
    });
  }

  const { wallet, password } = req.body;

  // Now check for wallet/password
  const query2 = {
    text: `SELECT *
    FROM wallet
    WHERE name = $1
    AND password IS NOT NULL`,
    values: [wallet],
  };
  // console.log(query2);
  const rval2 = await pool.query(query2);

  if (rval2.rows.length === 0) {
    console.log('ERROR: Authentication, invalid credentials');
    next({
      log: 'Error: Invalid credentials',
      status: 401,
      message: { err: 'Error: Invalid credentials' },
    });
  }

  const wallets = rval2.rows[0];
  const hash = sha512(password, wallets.salt);

  if (hash !== wallets.password) {
    console.log('ERROR: Authentication, invalid credentials.');
    next({
      log: 'Error: Invalid credentials',
      status: 401,
      message: { err: 'Error: Invalid credentials' },
    });
  }
  const payload = {
    id: wallets.id,
  };
  const jwtModel = new JWTModel();
  const jwt = jwtModel.sign(payload);
  res.locals.jwt = jwt;
  next();
};



/* ________________________________________________________________________
 * Checks user access privileges
 * ________________________________________________________________________
*/

authController.checkAccess = (role) => {
    return async (req, res, next) => {
    const walletId = res.locals.wallet_id;
    const query = {
      text: `SELECT *
      FROM entity_role
      WHERE entity_id = $1
      AND role_name = $2
      AND enabled = TRUE`,
      values: [walletId, role]
    };
    const rval = await pool.query(query);

    if (rval.rows.length !== 1) {
      log.debug("check access fail...", walletId, role);
      next({
        log: `ERROR: Permission for ${role} not granted`,
        status: 401,
        message: { err: `ERROR: Permission to ${role} not granted`},
      });
    }
    next();
  }
};

module.exports = authController;
