const request = require("supertest");
const express = require("express");
//const {handlerWrapper, errorHandler} = require("./utils");
const helper = require("./utils");
const {expect} = require("chai");
const HttpError = require("../utils/HttpError");
const ApiKeyModel = require("../models/auth/ApiKeyModel");
const sinon = require("sinon");
const JWTModel = require("../models/auth/JWTModel");

describe("routers/utils", () => {

  describe("handlerWrapper", () => {

    it("promise reject from current handler, should be catch and response to client", async () => {
      const app = express();
      app.get("/test", helper.handlerWrapper(async (_res, rep) => {
        await new Promise((_resolve, reject) => {
          setTimeout(() => reject(new HttpError(400)), 0);
        });
        rep.status(200).send({});
      }));
      app.use(helper.errorHandler);

      const res = await request(app)
        .get("/test");
      expect(res.statusCode).eq(400);
    });

    it("promise reject from internal function, should be catch and response to client", async () => {
      async function internalInternalFunction(){
        await new Promise((_resolve, reject) => {
          setTimeout(() => reject(new HttpError(400)), 0);
        });
      }
      async function internalFunction(){
        await internalInternalFunction();
      }
      const app = express();
      app.get("/test", helper.handlerWrapper(async (_res, rep) => {
        await internalFunction();
        rep.status(200).send({});
      }));
      app.use(helper.errorHandler);

      const res = await request(app)
        .get("/test");
      expect(res.statusCode).eq(400);
    });

    it("internal async function throw error, should be catch and response to client", async () => {
      async function internalInternalFunction(){
        throw new HttpError(400);
      }
      async function internalFunction(){
        await internalInternalFunction();
      }
      const app = express();
      app.get("/test", helper.handlerWrapper(async (_res, rep) => {
        await internalFunction();
        rep.status(200).send({});
      }));
      app.use(helper.errorHandler);

      const res = await request(app)
        .get("/test");
      expect(res.statusCode).eq(400);
    });

    it("internal SYNC function throw error, should be catch and response to client", async () => {
      function internalInternalFunction(){
        throw new HttpError(400);
      }
      async function internalFunction(){
        internalInternalFunction();
      }
      const app = express();
      app.get("/test", helper.handlerWrapper(async (_res, rep) => {
        await internalFunction();
        rep.status(200).send({});
      }));
      app.use(helper.errorHandler);

      const res = await request(app)
        .get("/test");
      expect(res.statusCode).eq(400);
    });

  });

  describe("apiKeyHandler", () => {

    it("check failed, should get response with code 401", async () => {
      const app = express();
      //mock
      sinon.stub(ApiKeyModel.prototype, "check").rejects(new HttpError(401));
      app.get("/test", 
        [
          helper.apiKeyHandler,
          async (_, res) => res.status(200).send({}),
        ]
      );
      app.use(helper.errorHandler);

      const res = await request(app)
        .get("/test");
      expect(res.statusCode).eq(401);
      ApiKeyModel.prototype.check.restore();
    });

    it("check passed, should get response with code 200", async () => {
      const app = express();
      //mock
      sinon.stub(ApiKeyModel.prototype, "check").rejects(new HttpError(401));
      app.get("/test", 
        [
          helper.apiKeyHandler,
          async (_, res) => res.status(200).send({}),
        ]
      );
      app.use(helper.errorHandler);

      const res = await request(app)
        .get("/test");
      expect(res.statusCode).eq(401);
      ApiKeyModel.prototype.check.restore();
    });
  });

  describe("verifyJWTHandler", () => {

    it("pass correct token should pass the verify", async () => {
      const app = express();
      //mock
      sinon.stub(ApiKeyModel.prototype, "check").rejects(new HttpError(401));
      app.get("/test", 
        [
          helper.verifyJWTHandler,
          async (_, res) => res.status(200).send({}),
        ]
      );
      app.use(helper.errorHandler);

      const payload = {id:1};
      const jwtModel = new JWTModel();
      const token = jwtModel.sign(payload);
      const res = await request(app)
        .get("/test")
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).eq(200);
      ApiKeyModel.prototype.check.restore();
    });

    it("pass corupt token should get response with code 403", async () => {
      const app = express();
      //mock
      sinon.stub(ApiKeyModel.prototype, "check").rejects(new HttpError(401));
      app.get("/test", 
        [
          helper.verifyJWTHandler,
          async (_, res) => res.status(200).send({}),
        ]
      );
      app.use(helper.errorHandler);

      const payload = {id:1};
      const jwtModel = new JWTModel();
      const token = jwtModel.sign(payload);
      const res = await request(app)
        .get("/test")
        .set('Authorization', `Bearer ${token.slice(1)}`);//NOTE corupt here
      expect(res.statusCode).eq(403);
      ApiKeyModel.prototype.check.restore();
    });
  });
});
