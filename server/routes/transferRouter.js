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
          tokens: Joi.array().items(Joi.string()).required(),
          sender_wallet: Joi.alternatives().try(
            Joi.string().alphanum().min(4).max(32),
            Joi.number().min(1).max(32)
          ).required(),
          receiver_wallet: Joi.alternatives().try(
            Joi.string().alphanum().min(4).max(32),
            Joi.number().min(1).max(32)
          ).required(),
        }),
        otherwise: Joi.object({
          bundle: Joi.object({
            bundle_size: Joi.number(),
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
        for(let uuid of req.body.tokens){
          const token = await tokenService.getByUUID(uuid); 
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
        transfer_id: Joi.number().required(),
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
      Joi.alternatives().try(
        Joi.object({
          tokens: Joi.array().items(Joi.string()).required(),
        }),
        Joi.object({
          implicit: Joi.boolean().truthy().required(),
        }),
      )
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
          Joi.string().alphanum().min(4).max(32),
          Joi.number().min(4).max(32)
        ),
      })
    );
    const {state, wallet} = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let walletObject;
    if(wallet){
      walletObject = await walletService.getByIdOrName(wallet);
    }
    
    const result = await walletLogin.getTransfers(state, walletObject);
    const transferService = new TransferService(session);
    const json = [];
    for(let t of result){
      const j = await transferService.convertToResponse(t);
      json.push(j);
    }
    res.status(200).json({transfers: json});
  })
);

module.exports = transferRouter;
