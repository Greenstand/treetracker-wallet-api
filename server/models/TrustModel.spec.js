const TrustModel = require("./TrustModel");
const {expect} = require("chai");

describe("TrustModel", () => {

  it("get trust_relationships", async () => {
    const trustModel = new TrustModel();
    const trust_relationships = await trustModel.get();
    expect(trust_relationships).lengthOf(1);
  });

});

