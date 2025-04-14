const JWTTools = require('jsonwebtoken');
const log = require('loglevel');
const HttpError = require('../utils/HttpError');

const publicKEY = process.env.KEYCLOAK_PUBLIC_KEY?.replace(/\\n/g, '\n');
const verifyOptions = {
  issuer: process.env.KEYCLOAK_ISSUER,
  algorithms: ['RS256'],
};

class JWTService {
  static verify(authorization) {
    if (!authorization) {
      throw new HttpError(
        401,
        'ERROR: Authentication, no token supplied for protected path',
      );
    }
    const tokenArray = authorization.split('Bearer ');
    const token = tokenArray[1];
    let walletId;
    if (token) {
      // Decode the token
      JWTTools.verify(token, publicKEY, verifyOptions, (err, decod) => {
        if (err) {
          log.error(err?.message);
          throw new HttpError(401, 'ERROR: Authentication, token not verified');
        }
        if (!decod?.sub)
          throw new HttpError(
            401,
            'ERROR: Authentication, invalid token received',
          );
        walletId = decod.sub;
      });
    } else {
      throw new HttpError(401, 'ERROR: Authentication, invalid token received');
    }
    return { id: walletId };
  }
}

module.exports = JWTService;
