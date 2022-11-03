const { OK } = require('http-status-codes');
const assert = require('../libs/assertionLibrary.js');

/**
 * Assert expected wallet contain number of tokens
 * @param {Object} walletInfoResponse
 * @param {String} expectedWallet
 * @param {Number} expectedNumberOfTokens
 */
async function assertTokenInWallet(
  walletInfoResponse,
  expectedWallet,
  expectedNumberOfTokens,
) {
  const { wallets } = walletInfoResponse.body;
  assert.equals(
    walletInfoResponse.status,
    OK,
    'Response status does not match!',
  );

  for (let i; i < wallets.length; i += 1) {
    const wallet = wallets[i];
    if (Object.values(wallet).includes(expectedWallet)) {
      assert.equals(
        wallet.tokens_in_wallet,
        expectedNumberOfTokens,
        'Number of expected tokens do not equal!',
      );
      break;
    }
  }
}

/**
 * Get number of tokens from a specific wallet
 * @param {Object} walletInfoResponse
 * @param {String} expectedWallet
 * @return {Number} number of tokens in specific wallet
 */
async function getNumberOfTokensFromWallet(walletInfoResponse, expectedWallet) {
  const { wallets } = walletInfoResponse.body;
  assert.equals(
    walletInfoResponse.status,
    OK,
    'Response status does not match!',
  );

  for (let i; i < wallets.length; i += 1) {
    const wallet = wallets[i];
    if (Object.values(wallet).includes(expectedWallet)) {
      return wallet.tokens_in_wallet;
    }
  }
  return 0;
}

module.exports = {
  assertTokenInWallet,
  getNumberOfTokensFromWallet,
};
