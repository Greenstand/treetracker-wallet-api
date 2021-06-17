const {expect, sendPostRequest, sendGetRequest, responseStatus: {OK}, assert} = require("../../config");
const {assertTransferCompletedBody} = require("../../helpers/tokenActionsHelper.js");
const {assertTokenInWallet} = require("../../helpers/walletActionsHelper.js");
const {getSession} = require("../../libs/sessionLibrary");
const {testData} = require("../../libs/bootstrap.js");

let senderBearerToken = null;
let receiverBearerToken = null;
const apiKey = testData.apiKey;
const sendTokensUri = '/transfers';
const trustRelationshipUri = '/trust_relationships';
const acceptTrustRelationshipUri = (id) => `/trust_relationships/${id}/accept`
const getWalletInfoUri = (limit) => `/wallets?limit=${limit}`;
const receiverWallet = testData.walletTrustE.name;
const senderWallet = testData.walletTrustD.name;
const password = testData.wallet.password;

const headers = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'treetracker-api-key': apiKey
    }
};

const payload = (walletA, walletB) => {
    return {
        "bundle": {
            "bundle_size": 1
        },
        "sender_wallet": walletA,
        "receiver_wallet": walletB,
        "claim": false
    }
};

const requestTrustRelationshipPayload = (wallet) => {
    return {
        "trust_request_type": "manage",
        "requestee_wallet": wallet
    }
};

describe("Sending tokens with trust relationship (Wallet API)",function () {
    before(async () => {
        senderBearerToken = await getSession(senderWallet, password);
        receiverBearerToken = await getSession(receiverWallet, password);
    });

    it.only('Send token from wallet A to wallet B with trust relationship @token @regression', async () => {
        const requestTrustResponse = await sendPostRequest(trustRelationshipUri, headers(senderBearerToken.token), requestTrustRelationshipPayload(receiverWallet));
        const {body: requestTrustBody, status: requestTrustStatus} = requestTrustResponse;
        assert.equals(requestTrustStatus, OK, 'Request trust relationship response status does not equal!', requestTrustBody);
        expect(requestTrustBody).to.have.property("state").eq('requested');
        const requestRelationshipId = requestTrustBody.id;

        const acceptTrustResponse = await sendPostRequest(acceptTrustRelationshipUri(requestRelationshipId), headers(receiverBearerToken.token), {})
        const {body: acceptedTrustBody, status: acceptedTrustStatus} = acceptTrustResponse;
        assert.equals(acceptedTrustStatus, OK, 'Accept trust relationship response status does not equal!', acceptedTrustBody);
        expect(acceptedTrustBody).to.have.property("state").eq('trusted');

        const sendTokenResponse = await sendPostRequest(sendTokensUri, headers(senderBearerToken.token), payload(senderWallet, receiverWallet));
        assertTransferCompletedBody(sendTokenResponse, senderWallet, receiverWallet);

        const limit = 50;
        const getWalletInfoResponse = await sendGetRequest(getWalletInfoUri(limit), headers(receiverBearerToken.token));
        await assertTokenInWallet(getWalletInfoResponse, receiverWallet, 1);
    });
});
