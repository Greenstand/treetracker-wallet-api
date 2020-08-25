const {expect} = require("chai");
const controller = require("./relationshipController");
const mockKnex = require("mock-knex");
const tracker = mockKnex.getTracker();
const knex = require("../database/knex");

mockKnex.mock(knex);

describe("RelationshipController", () => {

  before(() => {
    tracker.install();
  });

  it("get", async () => {
    tracker.on("query", (query) => {
      query.response([{
        a:1,
      }]);
    });
    const req = {};
    const res = {
      locals: {},
    };
    const next = {};
    expect(controller).property("get");
    await controller.get(req, res, next);
    expect(res.locals.relationships).lengthOf(1);
  });

});

