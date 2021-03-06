const express = require('express');
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const TokenService = require("../services/TokenService");
const WalletService = require("../services/WalletService");
const HttpError = require("../utils/HttpError");
const Session = require("../models/Session");
const Joi = require("joi");

const tokenRouter = express.Router();


tokenRouter.get('/:id',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const {id} = req.params;
    const session = new Session();
    const tokenService = new TokenService(session);
    const walletService = new WalletService(session);
    const token = await tokenService.getById(id);
    //check permission
    const json = await token.toJSON();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let walletIds = [walletLogin.getId()];
    const subWallets = await walletLogin.getSubWallets();
    walletIds = [...walletIds, ...subWallets.map(e => e.getId())];
    if(walletIds.includes(json.wallet_id)){
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
  helper.handlerWrapper(async (req, res, _next) => {
    Joi.assert(
      req.query,
      Joi.object({
        limit: Joi.integer().required().max(10000),
        offset: Joi.integer().min(0),
        wallet: Joi.string(),
      })
    );
    const {limit, wallet, offset} = req.query;
    const session = new Session();
    const tokenService = new TokenService(session);
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let tokens = [];
    if(wallet){
      const walletInstance = await walletService.getByName(wallet);
      const isSub = await walletLogin.hasControlOver(walletInstance);
      if(!isSub){
        throw new HttpError(403, "Wallet do not belongs to wallet logged in");
      }
      tokens = await tokenService.getByOwner(walletInstance);
    }else{
      tokens = await tokenService.getByOwner(walletLogin);
    }

    //filter tokens by query, TODO optimization required
    tokens = tokens.slice(offset? offset:0, limit);
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

tokenRouter.get('/:id/transactions',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    // validate input
    Joi.assert(
      req.query,
      Joi.object({
        limit: Joi.integer().required().max(10000),
        offset: Joi.integer().min(0),
        id: Joi.string().guid(), 
        transactions: Joi.string(),
      })
    );
    const {limit, offset} = req.query;

    const session = new Session();
    const {id} = req.params;
    const tokenService = new TokenService(session);
    const walletService = new WalletService(session);
    const token = await tokenService.getById(id);
    //check permission
    const json = await token.toJSON();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let walletIds = [walletLogin.getId()];
    const subWallets = await walletLogin.getSubWallets();
    walletIds = [...walletIds, ...subWallets.map(e => e.getId())];
    if(walletIds.includes(json.wallet_id)){
      //pass
    }else{
      throw new HttpError(401, "Have no permission to visit this token");
    }
    const transactions = await token.getTransactions();
    let response = [];
    for(const t of transactions){
      const transaction = await tokenService.convertToResponse(t);
      response.push(transaction);
    }

    //filter transaction json by query
    let numStart = parseInt(offset);
    let numLimit = parseInt(limit);
    let numBegin = numStart?numStart:0;
    let numEnd=numBegin+numLimit;
    response = response.slice(numBegin, numEnd);
    // console.log(numBegin);
    // console.log(numEnd);
    // console.log(response);
    res.status(200).json({
      history: response,
    });
  })
)

module.exports = tokenRouter;
