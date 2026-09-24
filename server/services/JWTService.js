const JWTTools = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const log = require('loglevel');
const HttpError = require('../utils/HttpError');
const { JWT_ISSUERS } = require('./enums');

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
    let roles = [];
    if (token) {
      const KEYCLOAK_URL =
        process.env.KEYCLOAK_URL ||
        'http://keycloak-service.keycloak:8080/keycloak/realms/treetracker';

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
          issuer: JWT_ISSUERS,
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
          // Keycloak puts realm roles and per-client roles in separate claims,
          // and either may carry an admin role, so read both.
          roles = [
            ...new Set([
              ...(decod.realm_access?.roles || []),
              ...Object.values(decod.resource_access || {}).flatMap(
                (access) => access?.roles || [],
              ),
            ]),
          ];
        },
      );
    } else {
      throw new HttpError(401, 'ERROR: Authentication, invalid token received');
    }
    return { id: walletId, roles };
  }
}

module.exports = JWTService;
