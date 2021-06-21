const {expect} = require("chai");
const mockKnex = require("mock-knex");
const TransferRepository = require("./TransferRepository");
const knex = require("../database/knex");

const tracker = mockKnex.getTracker();
const Session = require("../models/Session");
const uuid = require('uuid');
const sinon = require('sinon');

describe("TransferRepository", () => {
  let transferRepository;

  const originatorWalletId = uuid.v4()
  const sourceWalletId = uuid.v4()
  const destinationWalletId = uuid.v4()

  beforeEach(() => {
    mockKnex.mock(knex);
    tracker.install();
    transferRepository = new TransferRepository(new Session());
  })

  afterEach(() => {
    tracker.uninstall();
    mockKnex.unmock(knex);
  });

  it("create", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/insert.*transfer.*/);
          query.response([{id:1}]);
        }
      ][step - 1]();
    });
    const result = await transferRepository.create({
      originator_wallet_id: originatorWalletId,
      source_wallet_id: sourceWalletId,
      destination_wallet_id: destinationWalletId,
    });
    expect(result).property('id').a('number');
  });

  it("getById", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/select.*transfer.*/);
          query.response({id:uuid.v4()});
        },
      ][step - 1]();
    });
    const result = await transferRepository.getById(1);
    expect(result).property("id").a("string");
  });

  it("getPendingTransfers", async () => {
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/select.*transfer.*where.*destination_wallet_id.*/);
          query.response([{id:originatorWalletId}]);
        },
      ][step - 1]();
    });
    const result = await transferRepository.getPendingTransfers(1);
    expect(result).lengthOf(1);
  });

  it("getTokensById", async () => {
    const data = [{
            capture_id: "c",
            token_id: "t",
          }];
    tracker.uninstall();
    tracker.install();
    tracker.on('query', function sendResult(query, step) {
      [
        function firstQuery() {
          expect(query.sql).match(/capture_id/);
          query.response(data);
        },
      ][step - 1]();
    });
    const result = await transferRepository.getTokenAndCaptureIds(1);
    sinon.assert.match(result, data);
  });

});

