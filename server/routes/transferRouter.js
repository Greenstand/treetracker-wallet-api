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
          tokens: Joi.array().items(Joi.string()).required().unique(),
          sender_wallet: Joi.alternatives().try(
            Joi.string(),
            Joi.number().min(1).max(32)
          ).required(),
          receiver_wallet: Joi.alternatives().try(
            Joi.string(),
            Joi.number().min(1).max(32)
          ).required(),
          // TODO: add boolean for claim, but default to false.
          claim: Joi.boolean(),
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
      // check if this transfer is a claim (claim == not transferrrable tokens)
      const claim = req.body.claim;

      let result;
      if(req.body.tokens){
        const tokens = [];
        const tokenService = new TokenService(session);
        for(let uuid of req.body.tokens){
          const token = await tokenService.getByUUID(uuid); 
          tokens.push(token);
        }
        //Case 1: with trust, token transfer
        console.log('HERE1');
        result = await walletLogin.transfer(walletSender, walletReceiver, tokens, claim);
      }else{
        //Case 2: with trust, bundle transfer
        // TODO: get only transferrable tokens
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
        transfer_id: Joi.number().required(),
      })
    );
    const session = new Session();
    //begin transaction
    try{
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      //TODO: claim 
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
        transfer_id: Joi.number().required(),
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
        transfer_id: Joi.number().required(),
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
        transfer_id: Joi.number().required(),
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
          tokens: Joi.array().items(Joi.string()).required().unique(),
        }),
        otherwise: Joi.object({
          implicit: Joi.boolean().truthy().required(),
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
        for(let uuid of req.body.tokens){
          const token = await tokenService.getByUUID(uuid); 
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
          Joi.number().min(4).max(32)
        ),
        limit: Joi.number().required(),
        start: Joi.number().min(1).max(10000).integer()
      })
    );
    const {state, wallet, limit, start} = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
//    let walletObject;
//    if(wallet){
//      walletObject = await walletService.getByIdOrName(wallet);
//    }
    let walletTransfer = walletLogin;
    if(wallet){
      walletTransfer = await walletService.getByIdOrName(wallet);
    }
    
    const result = await walletTransfer.getTransfers(state);
    const transferService = new TransferService(session);
    let json = [];
    // console.log(result);
    for(let t of result){
      const j = await transferService.convertToResponse(t);
      json.push(j);
    }
    // console.log(json);

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
        transfer_id: Joi.number().required(),
      })
    );
    const session = new Session();
    const walletService = new WalletService(session);
    const transferService = new TransferService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferObject = await walletLogin.getTransferById(parseInt(req.params.transfer_id));
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
        transfer_id: Joi.number().required(),
      })
    );

    Joi.assert(
      req.query,
      Joi.object({
        limit: Joi.number().required(),
        start: Joi.number().min(1).max(10000).integer(),
      })
    );
    const {limit, start} = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const tokens = await walletLogin.getTokensByTransferId(parseInt(req.params.transfer_id));
    let tokensJson = [];
    for(const token of tokens){
      const json = await token.toJSON();
      tokensJson.push(json);
    }
    // console.log(tokensJson);
    //filter tokensJson by query
    let numStart = parseInt(start);
    let numLimit = parseInt(limit);
    let numBegin = numStart?numStart-1:0;
    let numEnd=numBegin+numLimit;
    tokensJson = tokensJson.slice(numBegin, numEnd);
    console.log(tokensJson);
    res.status(200).json({
      tokens: tokensJson,
    });
  })
);

module.exports = transferRouter;
