const express = require('express');
const transferRouter = express.Router();
const WalletService = require("../services/WalletService");
const Wallet = require("../models/Wallet");
const TrustRelationship = require("../models/TrustRelationship");
const expect = require("expect-runtime");
const helper = require("./utils");
const Joi = require("joi");


transferRouter.post('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    Joi.assert(
      req.body,
      Joi.object({
        tokens: Joi.array().items(Joi.string()).required(),
        sender_wallet: Joi.string()
          .required(),
        receiver_wallet: Joi.string()
          .required(),
      })
    );
    const walletService = new WalletService();
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const walletSender = await walletService.getByName(req.body.sender_wallet);
    const walletReceiver = await walletService.getByName(req.body.receiver_wallet);
    await walletLogin.transfer(walletSender, walletReceiver);
//    await walletLogin.checkTrust(
//      TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send,
//      walletSender,
//      walletReceiver,
//    );
//    expect(res.locals.wallet_id).number();
//    expect(req).property("body").property("trust_request_type").a(expect.any(String));
//    expect(req).property("body").property("wallet").a(expect.any(String));
//    const walletService = new WalletService();
//    const wallet = await walletService.getById(res.locals.wallet_id);
//    const trust_relationship = await wallet.requestTrustFromAWallet(
//      req.body.trust_request_type,
//      req.body.wallet,
//    );
    res.status(200).json({});
  })
);


module.exports = transferRouter;
