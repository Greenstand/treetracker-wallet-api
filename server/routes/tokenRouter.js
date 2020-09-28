const express = require('express');
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const Token = require("../models/Token");

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
    const token = await Token.buildByUUID(uuid);
    res.status(200).json(await token.toJSON());
  })
)

module.exports = tokenRouter;
