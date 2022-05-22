const {
  expect,
  sendGetRequest,
  sendPostRequest,
  responseStatus: { OK },
  assert,
} = require('../../config');
const { getSession } = require('../../libs/sessionLibrary');
const { testData } = require('../../libs/bootstrap.js');
const {
  assertSendTokensBody,
  assertTransferCompletedBody,
  assertTransferDeclinedBody,
} = require('../../helpers/tokenActionsHelper.js');
const {
  assertTokenInWallet,
  getNumberOfTokensFromWallet,
} = require('../../helpers/walletActionsHelper.js');

let senderBearerToken = null;
let receiverBearerToken = null;
let receiverEmptyBearerToken = null;
const { apiKey } = testData;
const tokenUid = testData.token.id;
const getTokenInfoUri = `/tokens/${tokenUid}`;
const sendTokensUri = '/transfers';
const acceptTokenTransferUri = (id) => `/transfers/${id}/accept`;
const declineTokenTransferUri = (id) => `/transfers/${id}/decline`;
const getWalletInfoUri = (limit) => `/wallets?limit=${limit}`;
const receiverWallet = testData.walletB.name;
const receiverEmptyWallet = testData.walletC.name;
const senderWallet = testData.wallet.name;
const { password } = testData.wallet;

const headers = (token) => {
  return {
    Authorization: `Bearer ${token}`,
    'treetracker-api-key': apiKey,
  };
};

const payload = (walletA, walletB) => {
  return {
    bundle: {
      bundle_size: 1,
    },
    sender_wallet: walletA,
    receiver_wallet: walletB,
    claim: false,
  };
};

describe('Sending tokens without trust relationship (Wallet API)', function () {
  before(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    senderBearerToken = await getSession(senderWallet, password);
    receiverBearerToken = await getSession(receiverWallet, password);
    receiverEmptyBearerToken = await getSession(receiverEmptyWallet, password);
  });

  it('Tokens - Verify all props received from details for one token @token @regression', async () => {
    const response = await sendGetRequest(
      getTokenInfoUri,
      headers(senderBearerToken.token),
    );

    const { body, status } = response;
    assert.equals(status, OK, 'Response status does not equal!', body);
    expect(body).to.have.property('id').eq(tokenUid);
    expect(body).to.have.property('capture_id');
    expect(body).to.have.property('wallet_id');
    expect(body).to.have.property('transfer_pending');
    expect(body).to.have.property('transfer_pending_id');
    expect(body).to.have.property('created_at');
    expect(body).to.have.property('updated_at');
    expect(body).to.have.property('links');
  });

  it('Tokens - Successful transfer of a token from A to B without trust relationship @token @regression @debug', async () => {
    const limit = 50;
    const initialWalletInfoResponse = await sendGetRequest(
      getWalletInfoUri(limit),
      headers(receiverBearerToken.token),
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const initialNumberOfTokens = await getNumberOfTokensFromWallet(
      initialWalletInfoResponse,
      receiverWallet,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await sendPostRequest(
      sendTokensUri,
      headers(senderBearerToken.token),
      payload(senderWallet, receiverWallet),
    );
    assertSendTokensBody(response, senderWallet, receiverWallet);
    const { id } = response.body;
    await new Promise((resolve) => setTimeout(resolve, 500));
    const acceptTransferResponse = await sendPostRequest(
      acceptTokenTransferUri(id),
      headers(receiverBearerToken.token),
      {},
    );

    assertTransferCompletedBody(
      acceptTransferResponse,
      senderWallet,
      receiverWallet,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const getWalletInfoResponse = await sendGetRequest(
      getWalletInfoUri(limit),
      headers(receiverBearerToken.token),
    );
    await assertTokenInWallet(
      getWalletInfoResponse,
      receiverWallet,
      initialNumberOfTokens + 1,
    );
  });

  it('Tokens - Declined transfer of a token from A to B without trust relationship @token @regression @debug', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await sendPostRequest(
      sendTokensUri,
      headers(senderBearerToken.token),
      payload(senderWallet, receiverEmptyWallet),
    );
    assertSendTokensBody(response, senderWallet, receiverEmptyWallet);
    const { id } = response.body;

    await new Promise((resolve) => setTimeout(resolve, 500));
    const declineTransferResponse = await sendPostRequest(
      declineTokenTransferUri(id),
      headers(receiverEmptyBearerToken.token),
      {},
    );
    assertTransferDeclinedBody(
      declineTransferResponse,
      senderWallet,
      receiverEmptyWallet,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const limit = 50;
    const getWalletInfoResponse = await sendGetRequest(
      getWalletInfoUri(limit),
      headers(receiverEmptyBearerToken.token),
    );
    await assertTokenInWallet(getWalletInfoResponse, receiverEmptyWallet, 0);
  });
});
