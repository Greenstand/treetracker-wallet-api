const request = require("supertest");
const express = require("express");
const authRouter = require("./authRouter");
const {expect} = require("chai");
const {errorHandler} = require("./utils");
const sinon = require("sinon");

describe("authRouter", () => {
  let app;

  before(() => {
    app = express();
    app.use(authRouter);
    app.use(errorHandler);
  })

  it("wallet: 123 should throw error", async () => {
    const res = await request(app)
      .post("/")
      .send({
        wallet: "abc",
        password: "xxx",
      });
    expect(res).property("statusCode").eq(200);
  });
});
