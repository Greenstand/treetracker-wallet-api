const express = require('express');
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const TokenService = require("../services/TokenService");
const WalletService = require("../services/WalletService");

const tokenRouter = express.Router();
tokenRouter.get('/:uuid',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const {uuid} = req.params;
    const tokenService = new TokenService();
    const token = await tokenService.getByUUID(uuid);
    const json = await token.toJSON();
    res.status(200).json(json);
  })
)

tokenRouter.get('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const tokenService = new TokenService();
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const tokens = await tokenService.getByOwner(walletLogin);
    const tokensJson = [];
    for(let token of tokens){
      const json = await token.toJSON();
      tokensJson.push(json);
    }
    res.status(200).json({
      tokens: tokensJson,
    });
  })
)

module.exports = tokenRouter;
