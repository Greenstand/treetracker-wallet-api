const authController = {};
const bearerToken = require('express-bearer-token');
const JWT = require('jsonwebtoken');
const Crypto = require('crypto');
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const FS = require('fs');

const config = require('../../config/config.js');

// PRIVATE and PUBLIC key
const privateKEY = FS.readFileSync('../config/jwtRS256.key', 'utf8');
const publicKEY = FS.readFileSync('../config/jwtRS256.key.pub', 'utf8');

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

const sha512 = function(password, salt) {
  const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};

// API Key Verification
authController.apiKey = async (req, res, next) => {
  if (!req.headers['treetracker-api-key']) {
    console.log('ERROR: Invalid access - no API key');
    return next({
      log: 'Invalid API access',
      status: 401,
      message: { err:'Invalid API access'}
    });
    // res.status(406).send('Error: Invalid access - no API key');
    // res.end();
    // return;
  }
  const apiKey = req.headers['treetracker-api-key'];
  const query = {
    text: `SELECT *
    FROM api_key
    WHERE key = $1
    AND tree_token_api_access`,
    values: [apiKey]
  };
  const rval = await pool.query(query);

  if (rval.rows.length === 0) {
    console.log('ERROR: Authentication, Invalid access');
    // return next( {'Error: Invalid API access'});
    // res.status(401).send('Error: Invalid API access');
    // res.end();
    // return;
  }
  res.locals.api = true;
  console.log("Valid Access");
  next();
};

// Authorization Route - checks wallet and password
authController.authorize = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ errors: errors.array() });
    //  return res.status(422).json({ errors: errors.array() });
  }
  if (!req.body || (!req.body['wallet'] || !req.body['password'] )) {
    console.log('ERROR: Authentication, no credentials submitted');
    return next('Error: No credentials submitted');
    // res.status(406).send('Error: No credentials submitted 1');
    // res.end();
    // return;
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
    // res.status(401).send('Error: Invalid credentials');
    // res.end();
    // return;
    return next('Error: Invalid credentials');
  } 

  const entity = rval2.rows[0];
  const hash = sha512(password, entity.salt);

  if(hash != entity.password){
    console.log('ERROR: Authentication, invalid credentials');
    // res.status(401).send('Error: Invalid credentials');
    // res.end();
    // return;
    return next('Error: Invalid credentials');
  }
  res.locals.id = entity.id;
  next();
};

// JWT Verification 
authController.verifyJWT = (req, res, next) => {
  const payload = {
    id: res.locals.id
  };
  const jwt = JWT.sign(payload, privateKEY, signingOptions);
  res.locals.jwt = jwt;
  next();
};


// middleware layer that checks jwt authentication

// app.use(bearerToken());
// app.use((req, res, next)=>{
//   // check header or url parameters or post parameters for token
//   var token = req.token;
//   if(token){
//     //Decode the token
//     JWT.verify(token, publicKEY, verifyOptions, (err,decod)=>{
//       if(err){
//         console.log(err);
//         console.log('ERROR: Authentication, token not verified');
//         res.status(403).json({
//           message:"Wrong Token"
//         });
//       }
//       else{
//         req.payload = decod;
//         req.entity_id = decod.id;
//         next();
//       }
//     });
//   }
//   else{
//     console.log('ERROR: Authentication, no token supplied for protected path');
//     res.status(403).json({
//       message:"No Token"
//     });
//   }
// });



// const checkAccess = async function(entityId, roleName){

// const query = {
//   text: `SELECT *
//   FROM entity_role
//   WHERE entity_id = $1
//   AND role_name = $2
//   AND enabled = TRUE`,
//   values: [entityId, roleName]
// }
// const rval = await pool.query(query);

// return rval.rows.length == 1;

// }

module.exports = authController;
