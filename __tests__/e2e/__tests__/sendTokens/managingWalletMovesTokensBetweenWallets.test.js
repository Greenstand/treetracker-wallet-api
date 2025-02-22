const {
  expect,
  sendPostRequest,
  sendGetRequest,
  responseStatus: { OK },
  assert,
} = require('../../config');
const {
  assertTransferCompletedBody,
  assertSendTokensBody,
} = require('../../helpers/tokenActionsHelper.js');
const { assertTokenInWallet } = require('../../helpers/walletActionsHelper.js');
const { getSession } = require('../../libs/sessionLibrary');
const { testData } = require('../../libs/bootstrap.js');

let walletAToken = null;
let walletBToken = null;
let managingWalletToken = null;
const sendTokensUri = '/transfers';
const trustRelationshipUri = '/trust_relationships';
const acceptTrustRelationshipUri = (id) => `/trust_relationships/${id}/accept`;
const acceptTokenTransferUri = (id) => `/transfers/${id}/accept`;
const getWalletInfoUri = (limit) => `/wallets?limit=${limit}`;
const walletA = testData.wallet.name;
const managingWallet = testData.managingWallet.name;
const walletB = testData.walletB.name;
const { password } = testData.wallet;

const headers = (token) => {
  return {
    Authorization: `Bearer ${token}`,
  };
};

const payload = (senderWallet, receiverWalletB) => {
  return {
    bundle: {
      bundle_size: 1,
    },
    sender_wallet: senderWallet,
    receiver_wallet: receiverWalletB,
    claim: false,
  };
};

const requestTrustRelationshipPayload = (wallet) => {
  return {
    trust_request_type: 'manage',
    requestee_wallet: wallet,
  };
};

describe('Sending tokens via managed wallet (Wallet API)', function () {
  before(async () => {
    walletAToken = await getSession(walletA, password);
    walletBToken = await getSession(walletB, password);
    managingWalletToken = await getSession(managingWallet, password);
  });

  it('Managing wallet C sends from A to B with manage rights on wallet A @token @regression', async () => {
    const requestTrustResponse = await sendPostRequest(
      trustRelationshipUri,
      headers(managingWalletToken.token),
      requestTrustRelationshipPayload(walletA),
    );
    const {
      body: requestTrustBody,
      status: requestTrustStatus,
    } = requestTrustResponse;
    assert.equals(
      requestTrustStatus,
      OK,
      'Request trust relationship response status does not equal!',
    );

    expect(requestTrustBody).to.have.property('state').eq('requested');
    const requestRelationshipId = requestTrustBody.id;

    const acceptTrustResponse = await sendPostRequest(
      acceptTrustRelationshipUri(requestRelationshipId),
      headers(walletAToken.token),
      {},
    );
    const {
      body: acceptedTrustBody,
      status: acceptedTrustStatus,
    } = acceptTrustResponse;
    assert.equals(
      acceptedTrustStatus,
      OK,
      'Accept trust relationship response status does not equal!',
    );
    expect(acceptedTrustBody).to.have.property('state').eq('trusted');

    const sendTokenResponse = await sendPostRequest(
      sendTokensUri,
      headers(managingWalletToken.token),
      payload(walletA, walletB),
    );
    assertSendTokensBody(sendTokenResponse, managingWallet, walletB);
    const { id } = sendTokenResponse.body;

    const acceptTransferResponse = await sendPostRequest(
      acceptTokenTransferUri(id),
      headers(walletBToken.token),
      {},
    );
    assertTransferCompletedBody(acceptTransferResponse, walletA, walletB);

    const limit = 50;
    const getWalletInfoResponse = await sendGetRequest(
      getWalletInfoUri(limit),
      headers(walletBToken.token),
    );
    await assertTokenInWallet(getWalletInfoResponse, walletB, 1);
  });
});
