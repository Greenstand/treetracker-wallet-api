const JWTTools = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const log = require('loglevel');
const HttpError = require('../utils/HttpError');

class JWTService {
  static async verify(authorization) {
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
      // get the public key
      const KEYCLOAK_URL =
        process.env.KEYCLOAK_URL ||
        'https://dev-k8s.treetracker.org/keycloak/realms/treetracker';

      const client = jwksClient({
        jwksUri: `${KEYCLOAK_URL}/protocol/openid-connect/certs`,
      });
      const r = await client.getSigningKey();
      const publicKey = r.getPublicKey();

      // Decode the token
      JWTTools.verify(
        token,
        publicKey,
        {
          issuer: KEYCLOAK_URL,
          algorithms: ['RS256'],
        },
        (err, decod) => {
          if (err) {
            log.error(err?.message);
            throw new HttpError(
              401,
              'ERROR: Authentication, token not verified',
            );
          }
          if (!decod?.sub)
            throw new HttpError(
              401,
              'ERROR: Authentication, invalid token received',
            );
          walletId = decod.sub;
        },
      );
    } else {
      throw new HttpError(401, 'ERROR: Authentication, invalid token received');
    }
    return { id: walletId };
  }
}

module.exports = JWTService;
