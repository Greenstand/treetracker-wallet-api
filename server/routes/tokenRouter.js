const express = require('express');
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const TokenModel = require("../models/TokenModel");

const tokenRouter = express.Router();
tokenRouter.get('/:uuid',
  [
    //TODO ? check('limit', 'Invalid limit number').optional().isNumeric({ min: 1, max: 1000 }),
    //TODO ? check('wallet', 'Invalid wallet name').optional().isAlphanumeric(),
  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
//TODO ? didn't defined access role for GET /token
//  (req, res, next) => {
//    res.locals.role = 'list_trees';
//    next();
//  },
//  authController.checkAccess,
  helper.handlerWrapper(async (req, res, next) => {
    const {uuid} = req.params;
    const tokenModel = new TokenModel();
    const tokens = await tokenModel.getByUUID(uuid);
    res.status(200).json({tokens});
  })
)

module.exports = tokenRouter;
