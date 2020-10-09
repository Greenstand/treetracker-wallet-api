const JWTService = require("./JWTService");
const {expect} = require("chai");



describe("JWTService", () => {

  it("signed payload should be able to be verified", () => {
    const payload = {id: 1};
    const jwtService = new JWTService();
    const token = jwtService.sign(payload);
    expect(token).match(/\S+/);
    const result = jwtService.verify(`Bearer ${token}`);
    expect(result).property("id").eq(1);
  });
});
