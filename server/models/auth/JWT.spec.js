const JWT = require("./JWT");
const {expect} = require("chai");



describe("JWT", () => {

  it("signed payload should be able to be verified", () => {
    const payload = {id: 1};
    const jwt = new JWT();
    const token = jwt.sign(payload);
    expect(token).match(/\S+/);
    const result = jwt.verify(`Bearer ${token}`);
    expect(result).property("id").eq(1);
  });
});
