require('dotenv').config()
const request = require('supertest');
const { expect } = require('chai');
const log = require('loglevel');
const chai = require("chai");
const server = require("../../server/app");
chai.use(require('chai-uuid'));
const walletA = require("../mock-data/walletA.json");
const testUtils = require("./testUtils");
const Transfer = require("../../server/models/Transfer");
const TokenA = require("../mock-data/TokenA");

describe('walletA login', () => {
  let registeredWalletA;
  let transfer;

  beforeEach(async () => {
    await testUtils.clear();
    registeredWalletA = await testUtils.registerAndLogin(walletA);
    await testUtils.addToken(registeredWalletA, TokenA);
  })

  it("walletA list his wallet list", async () => {
    const res = await request(server)
      .get(`/wallets?limit=1`)
      .set('Content-Type', "application/json")
      .set('treetracker-api-key', registeredWalletA.apiKey)
      .set('Authorization', `Bearer ${registeredWalletA.token}`)
      .expect(200);
    expect(res.body.wallets).lengthOf(1);
    expect(res.body.wallets[0].tokens_in_wallet).eq('1');
    expect(res.body.wallets[0].name).eq('walletA');
  });

});
