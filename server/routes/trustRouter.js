const express = require('express');
const trustRouter = express.Router();
const { check, validationResult } = require('express-validator');
const assert = require("assert");
const TrustModel = require('../models/TrustModel');
const expect = require("expect-runtime");
const helper = require("./utils");

trustRouter.get('/',
//  [
//    check('token').isUUID()
//  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const trustModel = new TrustModel();
    res.locals.response = {
      trust_relationships: await trustModel.getTrustModel().get(),
    }
    next();
  }),
  (_, res) => {
    assert(res.locals);
    assert(res.locals.response);
    res.status(200).json(res.locals.response);
  },
);

trustRouter.post('/',
//  [
//    check('token').isUUID()
//  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    const trustModel = new TrustModel();
    expect(req).property("body").property("trust_request_type").a(expect.any(String));
    expect(req).property("body").property("wallet").a(expect.any(String));
    const trust_relationship = await trustModel.request(
      req.body.trust_request_type,
      req.body.wallet,
    );
    res.status(200).json(trust_relationship);
  })
);

trustRouter.post('/:trustRelationshipId/accept',
//  [
//    check('token').isUUID()
//  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    const trustModel = new TrustModel();
    expect(req.params).property("trustRelationshipId").defined();
    await trustModel.accept(req.params.trustRelationshipId);
    res.status(200).json();
  })
);

module.exports = trustRouter;
