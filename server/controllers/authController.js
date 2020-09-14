const authController = {};
const JWT = require('jsonwebtoken');
const Crypto = require('crypto');
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const FS = require('fs');
const log = require("loglevel");
const path = require("path");
log.setLevel("debug");

// PRIVATE and PUBLIC key
console.warn("__dirname:", __dirname);
const privateKEY = FS.readFileSync(path.resolve(__dirname, '../../config/private.key'), 'utf8');
const publicKEY = FS.readFileSync(path.resolve(__dirname, '../../config/public.key'), 'utf8');

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
 * API Key Verification
 * ________________________________________________________________________
*/
authController.apiKey = async (req, res, next) => {
  if (!req.headers['treetracker-api-key']) {
    console.log('ERROR: Invalid access - no API key');
    next({
      log: 'Invalid access - no API key',
      status: 401,
      message: { err: 'Invalid access - no API key' },
    });
  }
  const apiKey = req.headers['treetracker-api-key'];
  const query = {
    text: `SELECT *
    FROM api_key
    WHERE key = $1
    AND tree_token_api_access`,
    values: [apiKey],
  };
  const rval = await pool.query(query);

  if (rval.rows.length === 0) {
    console.log('ERROR: Authentication, Invalid access');
    next({
      log: 'Invalid API access',
      status: 401,
      message: { err: 'Invalid API access' },
    });
  }
  console.log('Valid Access');
  next();
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
    FROM entity
    WHERE wallet = $1
    AND password IS NOT NULL`,
    values: [wallet],
  };
  console.log(query2);
  const rval2 = await pool.query(query2);

  if (rval2.rows.length === 0) {
    console.log('ERROR: Authentication, invalid credentials');
    next({
      log: 'Error: Invalid credentials',
      status: 401,
      message: { err: 'Error: Invalid credentials' },
    });
  }

  const entity = rval2.rows[0];
  const hash = sha512(password, entity.salt);

  if (hash !== entity.password) {
    console.log('ERROR: Authentication, invalid credentials.');
    next({
      log: 'Error: Invalid credentials',
      status: 401,
      message: { err: 'Error: Invalid credentials' },
    });
  }
  res.locals.id = entity.id;
  next();
};

/* ________________________________________________________________________
 * JWT Issuance upon prior authorization
 * ________________________________________________________________________
*/
authController.issueJWT = (req, res, next) => {
  const payload = {
    id: res.locals.id,
  };
  const jwt = JWT.sign(payload, privateKEY, signingOptions);
  res.locals.jwt = jwt;
  next();
};

/* ________________________________________________________________________
 * JWT Verification upon prior log in
 * ________________________________________________________________________
*/

authController.verifyJWT = (req, res, next) => {
  if (!req.headers.authorization) {
    console.log('ERROR: Authentication, no token supplied for protected path');
    next({
      log: 'ERROR: Authentication, no token supplied for protected path',
      status: 403,
      message: { err: 'ERROR: Authentication, no token supplied for protected path' },
    });
  }
  //accounts for the "Bearer" string before the token
  const tokenArray = req.headers.authorization.split(' ');
  const token = tokenArray[1];
  if (token) {
    // Decode the token
    JWT.verify(token, publicKEY, verifyOptions, (err, decod) => {
      if (err || tokenArray[0] !== 'Bearer') {
        console.log(err);
        console.log('ERROR: Authentication, token not verified');
        next({
          log: 'ERROR: Authentication, token not verified',
          status: 403,
          message: { err: 'ERROR: Authentication, token not verified' },
        });
      }
      res.locals.entity_id = decod.id;
    });
  }
  next();
};

/* ________________________________________________________________________
 * Checks user access privileges
 * ________________________________________________________________________
*/

authController.checkAccess = (role) => {
    return async (req, res, next) => {
    const entityId = res.locals.entity_id;
    const query = {
      text: `SELECT *
      FROM entity_role
      WHERE entity_id = $1
      AND role_name = $2
      AND enabled = TRUE`,
      values: [entityId, role]
    };
    const rval = await pool.query(query);

    if (rval.rows.length !== 1) {
      log.debug("check access fail...", entityId, role);
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
