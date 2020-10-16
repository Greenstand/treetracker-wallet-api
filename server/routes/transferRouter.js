const express = require('express');
const transferRouter = express.Router();
const WalletService = require("../services/WalletService");
const TransferService = require("../services/TransferService");
const Wallet = require("../models/Wallet");
const TrustRelationship = require("../models/TrustRelationship");
const expect = require("expect-runtime");
const helper = require("./utils");
const Joi = require("joi");
const TokenService = require("../services/TokenService");
const HttpError = require("../utils/HttpError");
const Transfer = require("../models/Transfer");


transferRouter.post('/',
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
          sender_wallet: Joi.string()
          .required(),
          receiver_wallet: Joi.string()
          .required(),
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
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const walletSender = await walletService.getByName(req.body.sender_wallet);
    const walletReceiver = await walletService.getByName(req.body.receiver_wallet);
    let result;
    if(req.body.tokens){
      const tokens = [];
      const tokenService = new TokenService();
      for(let uuid of req.body.tokens){
        const token = await tokenService.getByUUID(uuid); 
        tokens.push(token);
      }
      result = await walletLogin.transfer(walletSender, walletReceiver, tokens);
    }else{
      result = await walletLogin.transferBundle(walletSender, walletReceiver, req.body.bundle.bundle_size);
    }
    const transferService = new TransferService();
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
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferJson = await walletLogin.acceptTransfer(req.params.transfer_id);
    const transferService = new TransferService();
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
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
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferJson = await walletLogin.declineTransfer(req.params.transfer_id);
    const transferService = new TransferService();
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
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
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferJson = await walletLogin.cancelTransfer(req.params.transfer_id);
    const transferService = new TransferService();
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
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
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferJson = await walletLogin.fulfillTransfer(req.params.transfer_id);
    const transferService = new TransferService();
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
  })
);

transferRouter.get("/", 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    const {state, wallet} = req.query;
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const result = await walletLogin.getTransfers(state, wallet);
    const transferService = new TransferService();
    const json = [];
    for(let t of result){
      const j = await transferService.convertToResponse(t);
      json.push(j);
    }
    res.status(200).json({transfers: json});
  })
);


module.exports = transferRouter;
