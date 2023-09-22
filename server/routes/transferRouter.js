const express = require("express");
const transferRouter = express.Router();
const WalletService = require("../services/WalletService");
const TransferService = require("../services/TransferService");
const Wallet = require("../models/Wallet");
const TrustRelationship = require("../models/TrustRelationship");
const helper = require("./utils");
const Joi = require("joi");
const TokenService = require("../services/TokenService");
const HttpError = require("../utils/HttpError");
const Transfer = require("../models/Transfer");
const Session = require("../models/Session");

transferRouter.post(
  "/",
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.body,
      Joi.alternatives()
      //if there is tokens field
      .conditional(Joi.object({
        tokens: Joi.any().required(),
      }).unknown(),{
        then: Joi.object({
          tokens: Joi.array().items(Joi.string().uuid()).required().unique(),
          sender_wallet: Joi.alternatives().try(
            Joi.string(),
          ).required(),
          receiver_wallet: Joi.alternatives().try(
            Joi.string(),
          ).required(),
        }),
        otherwise: Joi.object({
          bundle: Joi.object({
            bundle_size: Joi.number().min(1).max(10000).integer(),
          }).required(),
          sender_wallet: Joi.string()
          .required(),
          receiver_wallet: Joi.string()
          .required(),
        }),
      })
    );
    const session = new Session();
    //begin transaction
    try{
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);

      const walletSender = await walletService.getByIdOrName(req.body.sender_wallet);
      const walletReceiver = await walletService.getByIdOrName(req.body.receiver_wallet);

      let result;
      if(req.body.tokens){
        const tokens = [];
        const tokenService = new TokenService(session);
        for(let id of req.body.tokens){
          const token = await tokenService.getById(id); 
          tokens.push(token);
        }
        result = await walletLogin.transfer(walletSender, walletReceiver, tokens);
      }else{
        result = await walletLogin.transferBundle(walletSender, walletReceiver, req.body.bundle.bundle_size);
      }
      const transferService = new TransferService(session);
      result = await transferService.convertToResponse(result);
      if(result.state === Transfer.STATE.completed){
        res.status(201).json(result);
      }else if(
        result.state === Transfer.STATE.pending || 
        result.state === Transfer.STATE.requested){
        res.status(202).json(result);
      }else{
        expect.fail();
      }
      await session.commitTransaction();
    }catch(e){
      if(e instanceof HttpError && !e.shouldRollback()){
        //if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      }else{
        //unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  })
);

transferRouter.post('/:transfer_id/accept',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().uuid().required(),
      })
    );
    const session = new Session();
    //begin transaction
    try{
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      const transferJson = await walletLogin.acceptTransfer(req.params.transfer_id);
      const transferService = new TransferService(session);
      const transferJson2 = await transferService.convertToResponse(transferJson);
      res.status(200).json(transferJson2);
      await session.commitTransaction();
    }catch(e){
      if(e instanceof HttpError && !e.shouldRollback()){
        //if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      }else{
        //unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  })
);

transferRouter.post('/:transfer_id/decline',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().uuid().required(),
      })
    );
    const session = new Session();
    //begin transaction
    try{
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      const transferJson = await walletLogin.declineTransfer(req.params.transfer_id);
      const transferService = new TransferService(session);
      const transferJson2 = await transferService.convertToResponse(transferJson);
      res.status(200).json(transferJson2);
      await session.commitTransaction();
    }catch(e){
      if(e instanceof HttpError && !e.shouldRollback()){
        //if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      }else{
        //unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  })
);

transferRouter.delete('/:transfer_id',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().uuid().required(),
      })
    );
    const session = new Session();
    //begin transaction
    try{
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      const transferJson = await walletLogin.cancelTransfer(req.params.transfer_id);
      const transferService = new TransferService(session);
      const transferJson2 = await transferService.convertToResponse(transferJson);
      res.status(200).json(transferJson2);
      await session.commitTransaction();
    }catch(e){
      if(e instanceof HttpError && !e.shouldRollback()){
        //if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      }else{
        //unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  })
);

transferRouter.post('/:transfer_id/fulfill',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().uuid().required(),
      })
    );
    Joi.assert(
      req.body,
      Joi.alternatives()
      //if there is tokens field
      .conditional(Joi.object({
        tokens: Joi.any().required(),
      }).unknown(),{
        then: Joi.object({
          tokens: Joi.array().items(Joi.string().uuid()).min(1).required().unique(),
        }),
        otherwise: Joi.object({
          implicit: Joi.boolean().truthy().required().messages({'any.required': 'A message body is required, either the implicit property or an array of token IDs'}),
        }),
      })
    );
    const session = new Session();
    //begin transaction
    try{
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const transferService = new TransferService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      let transferJson;
      if(req.body.implicit){
        transferJson = await walletLogin.fulfillTransfer(req.params.transfer_id);
      }else{
        //load tokens
        const tokens = [];
        const tokenService = new TokenService(session);
        for(let id of req.body.tokens){
          const token = await tokenService.getById(id); 
          tokens.push(token);
        }
        transferJson = await walletLogin.fulfillTransferWithTokens(req.params.transfer_id, tokens);
      }
      const transferJson2 = await transferService.convertToResponse(transferJson);
      res.status(200).json(transferJson2);
      await session.commitTransaction();
    }catch(e){
      if(e instanceof HttpError && !e.shouldRollback()){
        //if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      }else{
        //unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  })
);

transferRouter.get("/", 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.query,
      Joi.object({
        state: Joi.string()
          .valid(...Object.values(Transfer.STATE)),
        wallet: Joi.alternatives().try(
          Joi.string(),
          Joi.string().uuid(),
        ),
        limit: Joi.number().integer().min(1).max(2000).required(),
        start: Joi.number().integer().min(1).default(1)
      })
    );
    const {state, wallet, limit, start} = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let walletTransfer = walletLogin;
    if(wallet){
      walletTransfer = await walletService.getByIdOrName(wallet);
    }
    
    const result = await walletTransfer.getTransfers(state);
    const transferService = new TransferService(session);
    let json = [];
    for(let t of result){
      const j = await transferService.convertToResponse(t);
      json.push(j);
    }

    //filter tokensJson by query
    let numStart = parseInt(start);
    let numLimit = parseInt(limit);
    let numBegin = numStart?numStart-1:0;
    let numEnd=numBegin+numLimit;
    json = json.slice(numBegin, numEnd);
    res.status(200).json({transfers: json});
  })
);

transferRouter.get('/:transfer_id', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().uuid().required(),
      })
    );
    const session = new Session();
    const walletService = new WalletService(session);
    const transferService = new TransferService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferObject = await walletLogin.getTransferById(req.params.transfer_id);
    const transferJson = await transferService.convertToResponse(transferObject);
    res.status(200).json(transferJson);
  })
);

transferRouter.get('/:transfer_id/tokens',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().uuid().required(),
      })
    );

    Joi.assert(
      req.query,
      Joi.object({
        limit: Joi.number().integer().min(1).max(2000).required(),
        start: Joi.number().integer().min(1).default(1),
      })
    );
    const {limit, start} = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const tokens = await walletLogin.getTokensByTransferId(req.params.transfer_id);
    let tokensJson = [];
    for(const token of tokens){
      const json = await token.toJSON();
      tokensJson.push(json);
    }
    //filter tokensJson by query
    let numStart = parseInt(start);
    let numLimit = parseInt(limit);
    let numBegin = numStart?numStart-1:0;
    let numEnd=numBegin+numLimit;
    tokensJson = tokensJson.slice(numBegin, numEnd);
    res.status(200).json({
      tokens: tokensJson,
    });
  })
);

module.exports = transferRouter;
