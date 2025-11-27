const JWTTools = require('jsonwebtoken');
const log = require('loglevel');
const axios = require('axios');
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
        process.env.KEYCLOAK_URL || 'http://keycloak-service.keycloak:8080';
      let publicKey;

      try {
        const response = await axios.get(`${KEYCLOAK_URL}/realms/treetracker`);
        publicKey = response.data.public_key;
      } catch (error) {
        throw new HttpError(500, JSON.stringify(error?.response) || error);
      }

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
