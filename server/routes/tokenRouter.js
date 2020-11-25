const express = require('express');
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const TokenService = require("../services/TokenService");
const WalletService = require("../services/WalletService");
const HttpError = require("../utils/HttpError");
const Session = require("../models/Session");

const tokenRouter = express.Router();


tokenRouter.get('/:uuid',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const {uuid} = req.params;
    const session = new Session();
    const tokenService = new TokenService(session);
    const walletService = new WalletService(session);
    const token = await tokenService.getByUUID(uuid);
    //check permission
    const json = await token.toJSON();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let walletIds = [walletLogin.getId()];
    const subWallets = await walletLogin.getSubWallets();
    walletIds = [...walletIds, ...subWallets.map(e => e.getId())];
    if(walletIds.includes(json.entity_id)){
      //pass
    }else{
      throw new HttpError(401, "Have no permission to visit this token");
    }
    res.status(200).json(json);
  })
)


tokenRouter.get('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (_req, res, _next) => {
    const session = new Session();
    const tokenService = new TokenService(session);
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let tokens = await tokenService.getByOwner(walletLogin);

    /*
     * sub wallet
     */
    const subWallets = await walletLogin.getSubWallets();
    for(const wallet of subWallets){
      const tokensSub = await tokenService.getByOwner(wallet);
      tokens = [...tokens, ...tokensSub];
    }
    const tokensJson = [];
    for(const token of tokens){
      const json = await token.toJSON();
      tokensJson.push(json);
    }
    res.status(200).json({
      tokens: tokensJson,
    });
  })
)

tokenRouter.get('/:uuid/transactions',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const session = new Session();
    const {uuid} = req.params;
    const tokenService = new TokenService(session);
    const walletService = new WalletService(session);
    const token = await tokenService.getByUUID(uuid);
    //check permission
    const json = await token.toJSON();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let walletIds = [walletLogin.getId()];
    const subWallets = await walletLogin.getSubWallets();
    walletIds = [...walletIds, ...subWallets.map(e => e.getId())];
    if(walletIds.includes(json.entity_id)){
      //pass
    }else{
      throw new HttpError(401, "Have no permission to visit this token");
    }
    const transactions = await token.getTransactions();
    const response = [];
    for(const t of transactions){
      const transaction = await tokenService.convertToResponse(t);
      response.push(transaction);
    }
    res.status(200).json({
      history: response,
    });
  })
)

module.exports = tokenRouter;
