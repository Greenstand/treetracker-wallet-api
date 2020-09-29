const Trust = require("./Trust");
const chai = require("chai");
const {expect} = chai;
const jestExpect = require("expect");
const sinon = require("sinon");
const TrustRepository = require("../repositories/TrustRepository");
const WalletRepository = require("../repositories/WalletRepository");

describe("Trust", () => {
  let trust;

  before(() => {
    trust = new Trust();
  });

  after(() => {
  });


});

