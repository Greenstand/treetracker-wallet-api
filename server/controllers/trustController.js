const trustController = {};
const pool = require('../database/database.js');
const { check, validationResult } = require('express-validator');
const config = require('../../config/config.js');
const log = require("loglevel");
log.setLevel("debug");
const TrustModel = require("../models/TrustModel");


trustController.get = async (req, res, next) => {
  const trustModel = new TrustModel();
  res.locals.response = {
    trust_relationships: trustModel.get(),
  }
  next();
};

module.exports = trustController;
