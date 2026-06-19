const JWTTools = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const log = require('loglevel');
const HttpError = require('../utils/HttpError');
const { JWT_ISSUERS } = require('./enums');

const getPublicKey = async () => {
  if (process.env.KEYCLOAK_PUBLIC_KEY) {
    return process.env.KEYCLOAK_PUBLIC_KEY.replace(/\\n/g, '\n');
  }

  const issuer = process.env.KEYCLOAK_ISSUER || JWT_ISSUERS[0];
  const client = jwksClient({
    jwksUri: `${issuer}/protocol/openid-connect/certs`,
  });
  const key = await client.getSigningKey();
  return key.getPublicKey();
};

class JWTService {
  static async verify(authorization) {
    if (!authorization) {
      throw new HttpError(
        401,
        'ERROR: Authentication, no token supplied for protected path',
      );
    }
    if (!authorization.startsWith('Bearer ')) {
      throw new HttpError(401, 'ERROR: Authentication, invalid token received');
    }

    const token = authorization.slice('Bearer '.length);
    if (!token) {
      throw new HttpError(401, 'ERROR: Authentication, invalid token received');
    }

    const publicKey = await getPublicKey();
    const decoded = await new Promise((resolve, reject) => {
      JWTTools.verify(
        token,
        publicKey,
        {
          issuer: JWT_ISSUERS,
          algorithms: ['RS256'],
        },
        (err, payload) => {
          if (err) {
            log.error(err?.message);
            reject(
              new HttpError(401, 'ERROR: Authentication, token not verified'),
            );
            return;
          }
          resolve(payload);
        },
      );
    });

    if (!decoded?.sub) {
      throw new HttpError(401, 'ERROR: Authentication, invalid token received');
    }

    return { id: decoded.sub };
  }
}

module.exports = JWTService;
