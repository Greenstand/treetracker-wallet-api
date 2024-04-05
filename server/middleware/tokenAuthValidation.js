const { Strategy } = require('passport-http-bearer');
const axios = require('axios');
const passport = require('passport');
const WalletService = require('../services/WalletService');

const introspectToken = async (accessToken, clientId, clientSecret) => {
  try {
    const response = await axios.post(
      process.env.KEYCLOAK_INTROSPECTION_URL,
      {
        token: accessToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
    );

    let tokenContent = response.data;

    if (tokenContent.active) {
      // Token is active and valid
      // Retrieve the wallet_id that corresponds to the keycloak_account_id
      try {
        const walletService = new WalletService();
        const walletId = await walletService.getWalletIdByKeycloakId(
          tokenContent.sub,
        );

        tokenContent = { ...tokenContent, wallet_id: walletId.id };

        return { valid: true, tokenContent };
      } catch (error) {
        console.error(error);
      }
    }
    // Token is invalid or revoked
    return { valid: false, tokenContent };
  } catch (error) {
    console.error('Token introspection failed:', error);
    return { valid: false, error };
  }
};

const configurePassport = async (customPassport) => {
  customPassport.use(
    new Strategy(async (token, done) => {
      try {
        const introspectionResult = await introspectToken(
          token,
          process.env.KEYCLOAK_CLIENT,
          process.env.KEYCLOAK_CLIENT_SECRET,
        );
        if (introspectionResult.valid) {
          done(null, introspectionResult.tokenContent);
        } else {
          done(null, false);
        }
      } catch (error) {
        done(error);
      }
    }),
  );
};

const authenticateToken = passport.authenticate('bearer', { session: false });

module.exports = { configurePassport, authenticateToken };
