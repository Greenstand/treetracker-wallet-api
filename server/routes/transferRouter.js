const express = require('express');

const transferRouter = express.Router();
const Joi = require('joi');
const { assert } = require('joi');
const WalletService = require('../services/WalletService');
const TransferService = require('../services/TransferService');
const Wallet = require('../models/Wallet');
const TrustRelationship = require('../models/TrustRelationship');
const helper = require('./utils');
const TokenService = require('../services/TokenService');
const HttpError = require('../utils/HttpError');
const Transfer = require('../models/Transfer');
const Session = require('../models/Session');

transferRouter.post(
  '/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.body,
      Joi.alternatives()
      // if there is tokens field
      .conditional(Joi.object({
        tokens: Joi.any().required(),
      }).unknown(),{
        then: Joi.object({
          tokens: Joi.array().items(Joi.string()).required().unique(),
          sender_wallet: Joi.alternatives().try(
            Joi.string(),
          ).required(),
          receiver_wallet: Joi.alternatives().try(
            Joi.string(),
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
          claim: Joi.boolean().required(),
        }),
      })
    );
    const session = new Session();
    
    // begin transaction
    try{
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      const walletSender = await walletService.getByIdOrName(req.body.sender_wallet);
      const walletReceiver = await walletService.getByIdOrName(req.body.receiver_wallet);
      const transferService = new TransferService(session);
      // check if this transfer is a claim (claim == not transferrrable tokens)
      const claim = req.body.claim;

      let result;
      // TODO: put the claim boolean into each tokens
      if(req.body.tokens){
        const tokens = [];
        const tokenService = new TokenService(session);
        for (const id of req.body.tokens) {
          const token = await tokenService.getById(id);
          tokens.push(token);
        }
        // Case 1: with trust, token transfer
        result = await walletLogin.transfer(walletSender, walletReceiver, tokens, claim);
      }else{
        // Case 2: with trust, bundle transfer
        // TODO: get only transferrable tokens
        result = await walletLogin.transferBundle(walletSender, walletReceiver, req.body.bundle.bundle_size, claim);
      }

      // send message
      if (result.state === Transfer.STATE.completed) {
        // just send message in production 
        if(process.env.NODE_ENV !== "test"){
          await transferService.sendMessage(result.id);
        }
      }

      await session.commitTransaction();

      // response 
      result = await transferService.convertToResponse(result);
      if (result.state === Transfer.STATE.completed) {
        res.status(201).json(result);
      } else if (
        result.state === Transfer.STATE.pending ||
        result.state === Transfer.STATE.requested
      ) {
        res.status(202).json(result);
      } else {
        throw new Error(`Unexpected state ${result.state}`);
      }
    }catch(e){
      if(e instanceof HttpError && !e.shouldRollback()){
        // if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      }else{
        // unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  }),
);

transferRouter.post(
  '/:transfer_id/accept',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().guid().required(),
      }),
    );
    const session = new Session();
    // begin transaction
    try {
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);

      // TODO: claim 
      const transferJson = await walletLogin.acceptTransfer(req.params.transfer_id);
      const transferService = new TransferService(session);
      const transferJson2 = await transferService.convertToResponse(
        transferJson,
      );
      // just send message in production 
      if(process.env.NODE_ENV !== "test"){
        await transferService.sendMessage(transferJson.id);
      }
      await session.commitTransaction();
      res.status(200).json(transferJson2);
    } catch (e) {
      if (e instanceof HttpError && !e.shouldRollback()) {
        // if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      } else {
        // unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  }),
);

transferRouter.post(
  '/:transfer_id/decline',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().guid().required(),
      }),
    );
    const session = new Session();
    // begin transaction
    try {
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      const transferJson = await walletLogin.declineTransfer(
        req.params.transfer_id,
      );
      const transferService = new TransferService(session);
      const transferJson2 = await transferService.convertToResponse(
        transferJson,
      );
      await session.commitTransaction();
      res.status(200).json(transferJson2);
    } catch (e) {
      if (e instanceof HttpError && !e.shouldRollback()) {
        // if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      } else {
        // unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  }),
);

transferRouter.delete(
  '/:transfer_id',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().guid().required(),
      }),
    );
    const session = new Session();
    // begin transaction
    try {
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      const transferJson = await walletLogin.cancelTransfer(
        req.params.transfer_id,
      );
      const transferService = new TransferService(session);
      const transferJson2 = await transferService.convertToResponse(
        transferJson,
      );
      await session.commitTransaction();
      res.status(200).json(transferJson2);
    } catch (e) {
      if (e instanceof HttpError && !e.shouldRollback()) {
        // if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      } else {
        // unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  }),
);

transferRouter.post(
  '/:transfer_id/fulfill',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().guid().required(),
      }),
    );
    Joi.assert(
      req.body,
      Joi.alternatives()
        // if there is tokens field
        .conditional(
          Joi.object({
            tokens: Joi.any().required(),
          }).unknown(),
          {
            then: Joi.object({
              tokens: Joi.array().items(Joi.string()).required().unique(),
            }),
            otherwise: Joi.object({
              implicit: Joi.boolean().truthy().required(),
            }),
          },
        ),
    );
    const session = new Session();
    // begin transaction
    try {
      await session.beginTransaction();
      const walletService = new WalletService(session);
      const transferService = new TransferService(session);
      const walletLogin = await walletService.getById(res.locals.wallet_id);
      let transferJson;
      if (req.body.implicit) {
        transferJson = await walletLogin.fulfillTransfer(
          req.params.transfer_id,
        );
      } else {
        // load tokens
        const tokens = [];
        const tokenService = new TokenService(session);
        for (const id of req.body.tokens) {
          const token = await tokenService.getById(id);
          tokens.push(token);
        }
        transferJson = await walletLogin.fulfillTransferWithTokens(
          req.params.transfer_id,
          tokens,
        );
      }
      const transferJson2 = await transferService.convertToResponse(
        transferJson,
      );
      // just send message in production 
      if(process.env.NODE_ENV !== "test"){
        await transferService.sendMessage(transferJson.id);
      }
      await session.commitTransaction();
      res.status(200).json(transferJson2);
    } catch (e) {
      if (e instanceof HttpError && !e.shouldRollback()) {
        // if the error type is HttpError, means the exception has been handled
        await session.commitTransaction();
        throw e;
      } else {
        // unknown exception, rollback the transaction
        await session.rollbackTransaction();
        throw e;
      }
    }
  }),
);

transferRouter.get(
  '/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.query,
      Joi.object({
        state: Joi.string().valid(...Object.values(Transfer.STATE)),
        wallet: Joi.alternatives().try(
          Joi.string(),
          Joi.number().min(4).max(32),
        ),
        limit: Joi.number().min(1).max(1000).required(),
        offset: Joi.number().min(0).integer().default(0),
      }),
    );
    const { state, wallet, limit, offset } = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);

    let walletTransfer = walletLogin;
    if (wallet) {
      walletTransfer = await walletService.getByIdOrName(wallet);
    }
    // todo fix filtering by wallet, instead of undefined should take a wallet object with getId() function
    const result = await walletTransfer.getTransfers(
      state,
      undefined,
      offset,
      limit,
    );
    const transferService = new TransferService(session);
    const json = [];
    for (const t of result) {
      const j = await transferService.convertToResponse(t);
      json.push(j);
    }

    res.status(200).json({ transfers: json });
  }),
);

transferRouter.get(
  '/:transfer_id',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().guid().required(),
      }),
    );
    const session = new Session();
    const walletService = new WalletService(session);
    const transferService = new TransferService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferObject = await walletLogin.getTransferById(
      req.params.transfer_id,
    );
    const transferJson = await transferService.convertToResponse(
      transferObject,
    );
    res.status(200).json(transferJson);
  }),
);

transferRouter.get(
  '/:transfer_id/tokens',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.params,
      Joi.object({
        transfer_id: Joi.string().guid().required(),
      }),
    );

    Joi.assert(
      req.query,
      Joi.object({
        limit: Joi.number().min(1).max(1000).required(),
        offset: Joi.number().min(0).integer().default(0),
      }),
    );
    const { limit, offset } = req.query;
    const session = new Session();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const tokens = await walletLogin.getTokensByTransferId(
      req.params.transfer_id,
      Number(limit),
      Number(offset || 0),
    );

    const tokensJson = [];
    for (const token of tokens) {
      const json = await token.toJSON();
      tokensJson.push(json);
    }
    res.status(200).json({
      tokens: tokensJson,
    });
  }),
);

module.exports = transferRouter;
