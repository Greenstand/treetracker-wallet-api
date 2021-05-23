const expect = require("chai").expect;
const {ACCEPTED} = require("http-status-codes");
const assert = require("../libs/assertionLibrary.js");

/**
 * Assert send tokens response body to have expected properties and correct wallet names are included
 * @param {Object} response
 * @param {String} senderWallet
 * @param {String} receiverWallet
 */
function assertSendTokensBody(response, senderWallet, receiverWallet) {
    assert.equals(response.status, ACCEPTED, 'Response status does not equal!', response.body);
    expect(response.body).to.have.property("id");
    expect(response.body).to.have.property("active").eq(true);
    expect(response.body).to.have.property("originating_wallet").eq(senderWallet);
    expect(response.body).to.have.property("destination_wallet").eq(receiverWallet);
}

/**
 * Assert successfully accepted / completed transfer response body to have expected properties and correct wallet names are included
 * @param {Object} response
 * @param {String} senderWallet
 * @param {String} receiverWallet
 */
function assertTransferCompletedBody(response, senderWallet, receiverWallet) {
    expect(response.body).to.have.property("state").eq("completed");
}

/**
 * Assert transfer declined response body to have expected properties and correct wallet names are included
 * @param {Object} response
 * @param {String} senderWallet
 * @param {String} receiverWallet
 */
function assertTransferDeclinedBody(response, senderWallet, receiverWallet) {
    expect(response.body).to.have.property("state").eq("cancelled");
}

module.exports = {
    assertSendTokensBody,
    assertTransferCompletedBody,
    assertTransferDeclinedBody
};
