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
const WalletModel = require("../models/WalletModel");

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
