const jestExpect = require("expect");
const sinon = require("sinon");
const chai = require("chai");
const sinonChai = require("sinon-chai");

chai.use(sinonChai);
const {expect} = chai;
const TrustRelationship = require("./TrustRelationship");

describe("TrustRelationship", () => {

  describe("getTrustTypeByRequestType", () => {

    it("Request send should get send", () => {
      expect(TrustRelationship.getTrustTypeByRequestType(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send)).eq(TrustRelationship.ENTITY_TRUST_TYPE.send);
    });

    it("Request receive should get send", () => {
      expect(TrustRelationship.getTrustTypeByRequestType(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive)).eq(TrustRelationship.ENTITY_TRUST_TYPE.send);
    });
  });
});
