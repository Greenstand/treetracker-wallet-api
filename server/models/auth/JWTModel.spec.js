const JWTModel = require("./JWTModel");
const {expect} = require("chai");



describe("JWTModel", () => {

  it("signed payload should be able to be verified", () => {
    const payload = {id: 1};
    const jwtModel = new JWTModel();
    const token = jwtModel.sign(payload);
    expect(token).match(/\S+/);
    const result = jwtModel.verify(`Bearer ${token}`);
    expect(result).property("id").eq(1);
  });
});
