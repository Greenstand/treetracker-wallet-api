require('dotenv').config()
const request = require('supertest');
const { expect } = require('chai');
const log = require('loglevel');
const chai = require("chai");
const server = require("../../server/app");
chai.use(require('chai-uuid'));
const walletA = require("../mock-data/walletA.json");
const walletB = require("../mock-data/walletB.json");
const testUtils = require("./testUtils");
const Transfer = require("../../server/models/Transfer");
const TokenA = require("../mock-data/TokenA");

describe('walletA request to send 1 token to walletB', () => {
  let registeredWalletA;
  let registeredWalletB;
  let transfer;

  beforeEach(async () => {
    await testUtils.clear();
    registeredWalletA = await testUtils.registerAndLogin(walletA);
    await testUtils.addToken(registeredWalletA, TokenA);
    expect(registeredWalletA).property("id").a("string");
    registeredWalletB = await testUtils.registerAndLogin(walletB);
    transfer = await testUtils.sendAndPend(registeredWalletA,registeredWalletB, 1);
  })

  describe("walletB decline the request", () => {

    beforeEach(async () => {
      await request(server)
        .post(`/transfers/${transfer.id}/decline`)
        .set('Content-Type', "application/json")
        .set('treetracker-api-key', registeredWalletB.apiKey)
        .set('Authorization', `Bearer ${registeredWalletB.token}`)
        .expect(200);
    });

    it("The transfer status should be cancelled", async () => {

      await request(server)
        .get(`/transfers?limit=1000`)
        .set('treetracker-api-key', registeredWalletB.apiKey)
        .set('Authorization', `Bearer ${registeredWalletB.token}`)
        .expect(200)
        .then(res => {
          expect(res.body.transfers).lengthOf(1);
          expect(res.body.transfers[0]).property("state").eq(Transfer.STATE.cancelled);
        });

    });

    it("walletA should still have 1 token", async () =>{

      await request(server)
        .get(`/tokens?limit=10`)
        .set('treetracker-api-key', registeredWalletA.apiKey)
        .set('Authorization', `Bearer ${registeredWalletA.token}`)
        .expect(200)
        .then(res => {
          expect(res.body.tokens).lengthOf(1);
        });
    });
  });

});
