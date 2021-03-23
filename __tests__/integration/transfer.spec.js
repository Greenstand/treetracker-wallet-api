require('dotenv').config()
const request = require('supertest');
const server = require("../../server/app");
const { expect } = require('chai');
const log = require('loglevel');
const sinon = require("sinon");
const chai = require("chai");
chai.use(require('chai-uuid'));
const walletZaven = require("../mock-data/walletZaven.json");
const Meisze = require("../mock-data/Meisze.json");
const testUtils = require("./testUtils");

describe.only('Transfer', () => {
  let bearerToken;
  let bearerTokenB;
  let registeredZaven;
  let registeredMeisze;

  beforeEach(async () => {
    await testUtils.clear();
    registeredZaven = await testUtils.registerAndLogin(walletZaven);
    expect(registeredZaven).property("id").a("string");
    registeredMeisze = await testUtils.registerAndLogin(Meisze);
  })

  it(``, async () => {
    const transfer = await testUtils.sendAndPend(registeredZaven,registeredMeisze, 1);
    let res = await request(server)
      .post(`/transfers/${transfer.id}/decline`)
      .set('Content-Type', "application/json")
      .set('treetracker-api-key', registeredMeisze.apiKey)
      .set('Authorization', `Bearer ${registeredMeisze.token}`);
    console.log(res.body)
    expect(res).to.have.property('statusCode', 200);

    res = await request(server)
      .get(`/transfers?limit=1000`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.transfers).lengthOf(1);
    expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.cancelled);

    res = await request(server)
      .get(`/tokens/${seed.token.id}`)
      .set('treetracker-api-key', apiKey)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res).to.have.property('statusCode', 200);
    expect(res.body.wallet_id).eq(seed.wallet.id);
  });

});
