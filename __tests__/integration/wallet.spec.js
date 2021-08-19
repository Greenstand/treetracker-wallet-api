require('dotenv').config()
const request = require('supertest');
const { expect } = require('chai');
const log = require('loglevel');
const chai = require("chai");
const server = require("../../server/app");
chai.use(require('chai-uuid'));
const Zaven = require("../mock-data/Zaven.json");
const testUtils = require("./testUtils");
const Transfer = require("../../server/models/Transfer");
const TokenA = require("../mock-data/TokenA");

describe('Zaven login', () => {
  let registeredZaven;
  let transfer;

  beforeEach(async () => {
    await testUtils.clear();
    registeredZaven = await testUtils.registerAndLogin(Zaven);
    await testUtils.addToken(registeredZaven, TokenA);
  })

  it("Zaven list his wallet list", async () => {
    const res = await request(server)
      .get(`/wallets?limit=1`)
      .set('Content-Type', "application/json")
      .set('treetracker-api-key', registeredZaven.apiKey)
      .set('Authorization', `Bearer ${registeredZaven.token}`)
      .expect(200);
    expect(res.body.wallets).lengthOf(1);
    expect(res.body.wallets[0].tokens_in_wallet).eq('1');
    expect(res.body.wallets[0].name).eq('zaven');
  });

});
