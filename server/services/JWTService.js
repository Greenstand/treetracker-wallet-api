/* ________________________________________________________________________
 * JWT Issuance upon prior authorization, login
 * ________________________________________________________________________
 */
const JWTTools = require('jsonwebtoken');
const log = require('loglevel');
const jwksClient = require('jwks-rsa');
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

const client = jwksClient({
  jwksUri: `${process.env.PRIVATE_KEYCLOAK_BASE_URL}/realms/${process.env.PRIVATE_KEYCLOAK_REALM}/protocol/openid-connect/certs`
});

const fetchPublicKey = async (header) => {
  return new Promise((resolve, reject) => {
      client.getSigningKey(header.kid, (err, key) => {
          if (err) return reject(err);
          return resolve(key.publicKey || key.rsaPublicKey);
      });
  });
};

class JWTService {
  static sign(payload) {
    return JWTTools.sign(payload, privateKEY, signingOptions);
  }

  static async verify(authorization) {
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

      const decoded = JWTTools.decode(token, { complete: true });

      if (decoded.payload.iss === `${process.env.PRIVATE_KEYCLOAK_BASE_URL}/realms/${process.env.PRIVATE_KEYCLOAK_REALM}`) {
        
        try {
          const signingKey = await fetchPublicKey(decoded.header);
  
          result = JWTTools.verify(token, signingKey, {
            issuer: `${process.env.PRIVATE_KEYCLOAK_BASE_URL}/realms/${process.env.PRIVATE_KEYCLOAK_REALM}`,
            algorithms: ['RS256']
          });

          // Unlike server token, keycloak token does not have id property, so we temporarily use sub property
          // as a workaround to get the user id
          result.id = result.sub;
          return result;
        } catch (error) {
          log.debug('Keycloak token verification error', error);
          throw new HttpError(401, `Unauthorized: ${error.message}`);
        }
      } else {
          
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
      }

    } else {
      throw new HttpError(401, 'ERROR: Authentication, token not provided');
    }
    return result;
  }
}

module.exports = JWTService;
