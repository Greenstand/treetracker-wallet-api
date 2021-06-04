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

  describe("Zaven request to send 4 impact value to Meisze", () => {
    let transferId;


    beforeEach(async () => {
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
        .expect(202)
        .then(res => {
          expect(res).property("body").property("id").a("string");
          transferId = res.body.id;
        });
    });

    it.only("Meisze accept the transfer", async () => {
      await request(server)
        .post(`/transfers/${transferId}/accept`)
        .set('Content-Type', "application/json")
        .set('treetracker-api-key', registeredMeisze.apiKey)
        .set('Authorization', `Bearer ${registeredMeisze.token}`)
        .expect(200)
        .then(res => {
          expect(res).property("body").property("impact_value_transferred").eq(4);
        });

      // Meisze should have one token
      const token = await testUtils.getTokenById(TokenA.id);
      expect(token).property("id").a("string");
      expect(token).property("wallet_id").eq(registeredMeisze.id);

    });

    it("Meisze decline the transfer", async () => {
      await request(server)
        .post(`/transfers/${transferId}/decline`)
        .set('Content-Type', "application/json")
        .set('treetracker-api-key', registeredMeisze.apiKey)
        .set('Authorization', `Bearer ${registeredMeisze.token}`)
        .expect(200);

      // Zeven still have the token
      const token = await testUtils.getTokenById(TokenA.id);
      expect(token).property("id").a("string");
      expect(token).property("wallet_id").eq(registeredZaven.id);

    });

  });

  describe("Zaven request to send 4 impact value to Meisze, with the trust relationship between Z and M", () => {
    let transferId;

    beforeEach(async () => {
      log.warn("Add trust Z to M");
      testUtils.trustASendToB(registeredZaven, registeredMeisze);
    });

    beforeEach(async () => {
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
        .expect(201)
        .then(res => {
          expect(res).property("body").property("id").a("string");
          transferId = res.body.id;
          expect(res).property("body").property("impact_value_transferred").eq(4);
        });
    });

    it("Meisze already has the token", async () => {
      // Meisze should have one token
      const token = await testUtils.getTokenById(TokenA.id);
      expect(token).property("id").a("string");
      expect(token).property("wallet_id").eq(registeredMeisze.id);
    });
  });

});
