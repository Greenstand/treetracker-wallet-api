const request = require('supertest');
const Zaven = require("../mock-data/Zaven.json");
const Meisze = require("../mock-data/Meisze.json");
const TokenA = require("../mock-data/TokenA");
const testUtils = require("./testUtils");
const { expect } = require('chai');
const log = require('loglevel');
const server = require("../../server/app");

describe("Impact Value", () => {
  let registeredZaven;
  let registeredMeisze;

  beforeEach(async () => {
    await testUtils.clear();
    registeredZaven = await testUtils.registerAndLogin(Zaven);
    await testUtils.addToken(registeredZaven, TokenA);
    registeredMeisze = await testUtils.registerAndLogin(Meisze);
  })

  it.only("Zaven request to send 4 impact value to Meisze", async () => {
    await request(server)
      .post(`/transfers`)
      .set('Content-Type', "application/json")
      .set('treetracker-api-key', registeredMeisze.apiKey)
      .set('Authorization', `Bearer ${registeredZaven.token}`)
      .send({
        sender_wallet: registeredZaven.name,
        receiver_wallet: registeredMeisze.name,
        impact: {
          value: 4,
          accept_deviation: 2,
        }
      })
      .expect(202);
  });

  it("Meisze accept the request, then token worth 4 impact should belong to Meisze", () => {
  });

  it("Meisze decline the request, then token worth 4 impact should belong to Zaven", () => {
  });

});
