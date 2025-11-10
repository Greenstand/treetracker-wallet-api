const { expect } = require('chai');
require('../setup'); // Configure loglevel based on NODE_LOG_LEVEL
const log = require('loglevel');
const axios = require('axios');
const JWTService = require('./JWTService');

describe('JWTService', () => {
  it('signed payload should be able to be verified', async () => {
    const payload = { id: 1 };
    const token = JWTService.sign(payload);
    expect(token).match(/\S+/);
    const result = await JWTService.verify(`Bearer ${token}`);
    expect(result).property('id').eq(1);
  });

  it('Keycloak token should be able to be verified', async () => {
    
    // While we can use keycloak token from env file, its a good idea to use fresh token for testing
    // const keycloakUserToken = process.env.KEYCLOAK_USER_TOKEN || '';

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.PRIVATE_KEYCLOAK_CLIENT_ID);
    params.append('client_secret', process.env.PRIVATE_KEYCLOAK_CLIENT_SECRET);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    try {
      const response = await axios.post(`${process.env.PRIVATE_KEYCLOAK_BASE_URL}/realms/${process.env.PRIVATE_KEYCLOAK_REALM}/protocol/openid-connect/token`, params, { headers });
      const keycloakUserToken = response.data.access_token;
      const result = await JWTService.verify(`Bearer ${keycloakUserToken}`);
      expect(result).property('preferred_username').eq(`service-account-${process.env.PRIVATE_KEYCLOAK_CLIENT_ID}`);
    } catch (error) {
      log.debug(error);
      throw error;
    }
  });
});
