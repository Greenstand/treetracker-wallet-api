const Keycloak = require('keycloak-connect');
const { memoryStore } = require('./sessionConfig');

const keycloakConfig = {
  clientId: process.env.KEYCLOAK_CLIENT,
  bearerOnly: true,
  serverUrl: process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
  realmPublicKey: process.env.KEYCLOAK_REALM_PUBLIC_KEY,
  sslRequired: 'external',
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

module.exports = keycloak;
