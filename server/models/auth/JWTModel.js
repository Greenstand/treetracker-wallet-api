/* ________________________________________________________________________
 * JWT Issuance upon prior authorization, login
 * ________________________________________________________________________
*/
const JWT = require('jsonwebtoken');
const Crypto = require('crypto');
const FS = require('fs');
const log = require("loglevel");
const path = require("path");
const HttpError = require("../../utils/HttpError");
log.setLevel("debug");

// PRIVATE and PUBLIC key
console.warn("__dirname:", __dirname);
const privateKEY = FS.readFileSync(path.resolve(__dirname, '../../../config/jwtRS256.key'), 'utf8');
const publicKEY = FS.readFileSync(path.resolve(__dirname, '../../../config/jwtRS256.key.pub'), 'utf8');

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


class JWTModel{

  sign(payload){
    return JWT.sign(payload, privateKEY, signingOptions);
  }

  verify(authorization) {
    if (!authorization) {
      throw (403, 'ERROR: Authentication, no token supplied for protected path');
    }
    //accounts for the "Bearer" string before the token
    const tokenArray = authorization.split(' ');
    const token = tokenArray[1];
    let result;
    if (token) {
      // Decode the token
      JWT.verify(token, publicKEY, verifyOptions, (err, decod) => {
        if (err || tokenArray[0] !== 'Bearer') {
          log.debug(err);
          throw new HttpError(403, 'ERROR: Authentication, token not verified');
        }
        result = decod;
      });
    }else{
      throw new HttpError(403, 'ERROR: Authentication, token not verified');
    }
    return result;
  }

}

module.exports = JWTModel;
