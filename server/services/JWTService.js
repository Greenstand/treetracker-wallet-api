/* ________________________________________________________________________
 * JWT Issuance upon prior authorization, login
 * ________________________________________________________________________
 */
const JWTTools = require('jsonwebtoken');
const log = require('loglevel');
const HttpError = require('../utils/HttpError');

// PRIVATE and PUBLIC key
const privateKEY = process.env.PRIVATE_KEY.replace(/\\n/g, '\n'); // FS.readFileSync(path.resolve(__dirname, '../../config/jwtRS256.key'), 'utf8');
const publicKEY = process.env.PUBLIC_KEY.replace(/\\n/g, '\n'); // FS.readFileSync(path.resolve(__dirname, '../../config/jwtRS256.key.pub'), 'utf8');

const signingOptions = {
  issuer: 'greenstand',
  expiresIn: '365d',
  algorithm: 'RS256',
};

const verifyOptions = {
  issuer: 'greenstand',
  expiresIn: '365d',
  algorithms: ['RS256'],
};

class JWTService {
  static sign(payload) {
    return JWTTools.sign(payload, privateKEY, signingOptions);
  }

  static verify(authorization) {
    if (!authorization) {
      throw new HttpError(
        401,
        'ERROR: Authentication, no token supplied for protected path',
      );
    }
    // accounts for the "Bearer" string before the token
    const tokenArray = authorization.split(' ');
    const token = tokenArray[1];
    let result;
    if (token) {
      // Decode the token
      JWTTools.verify(token, publicKEY, verifyOptions, (err, decod) => {
        if (err || tokenArray[0] !== 'Bearer') {
          log.debug(err);
          throw new HttpError(401, 'ERROR: Authentication, token not verified');
        }
        result = decod;
        if (!result.id)
          throw new HttpError(
            401,
            'ERROR: Authentication, invalid token received',
          );
      });
    } else {
      throw new HttpError(401, 'ERROR: Authentication, token not verified');
    }
    return result;
  }
}

module.exports = JWTService;
