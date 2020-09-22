const trustController = {};
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const config = require('../../config/config.js');
const log = require("loglevel");
log.setLevel("debug");
const TrustModel = require("../models/TrustModel");
const asyncHandler = require('express-async-handler');
const expect = require("expect-runtime");

const asyncUtil = fn =>
function asyncUtilWrap(...args) {
  const fnReturn = fn(...args)
  const next = args[args.length-1]
  return Promise.resolve(fnReturn).catch(e => {
    console.error("get error:", e);
    next(e);
  })
}

trustController.get = async (req, res, next) => {
  const trustModel = new TrustModel();
  res.locals.response = {
    trust_relationships: await trustModel.get(),
  }
  next();
};

trustController.request = asyncUtil(async (req, res, next) => {
  const trustModel = new TrustModel();
  expect(req).property("body").property("trust_request_type").a(expect.any(String));
  expect(req).property("body").property("wallet").a(expect.any(String));
  const trust_relationships = await trustModel.request(
      req.body.trust_request_type,
      req.body.wallet,
    );
  res.locals.response = {
    trust_relationships,
  };
  next();
});

module.exports = trustController;
