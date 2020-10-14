const express = require('express');
const trustRouter = express.Router();
const { check, validationResult } = require('express-validator');
const assert = require("assert");
const WalletService = require("../services/WalletService");
const Wallet = require("../models/Wallet");
const expect = require("expect-runtime");
const helper = require("./utils");

trustRouter.get('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    expect(res.locals).property("wallet_id").number();
    const walletService = new WalletService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const trust_relationships = await wallet.getTrustRelationships(
      req.query.state,
      req.query.type,
      req.query.request_type,
    );
    res.status(200).json({
      trust_relationships,
    });
  }),
);

trustRouter.post('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals.wallet_id).number();
    expect(req).property("body").property("trust_request_type").a(expect.any(String));
    expect(req).property("body").property("wallet").a(expect.any(String));
    const walletService = new WalletService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const trust_relationship = await wallet.requestTrustFromAWallet(
      req.body.trust_request_type,
      req.body.wallet,
    );
    res.status(200).json(trust_relationship);
  })
);

trustRouter.post('/:trustRelationshipId/accept',
//  [
//    check('token').isUUID()
//  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals).property("wallet_id").number();
    expect(req.params).property("trustRelationshipId").defined();
    const trustRelationshipId = parseInt(req.params.trustRelationshipId);
    const walletService = new WalletService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    await wallet.acceptTrustRequestSentToMe(trustRelationshipId);
    res.status(200).json();
  })
);

trustRouter.post('/:trustRelationshipId/decline',
//  [
//    check('token').isUUID()
//  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals).property("wallet_id").number();
    expect(req.params).property("trustRelationshipId").defined();
    const trustRelationshipId = parseInt(req.params.trustRelationshipId);
    const walletService = new WalletService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    await wallet.declineTrustRequestSentToMe(trustRelationshipId);
    res.status(200).json();
  })
);

trustRouter.delete('/:trustRelationshipId',
//  [
//    check('token').isUUID()
//  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals).property("wallet_id").number();
    expect(req.params).property("trustRelationshipId").defined();
    const trustRelationshipId = parseInt(req.params.trustRelationshipId);
    const walletService = new WalletService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    await wallet.cancelTrustRequestSentToMe(trustRelationshipId);
    res.status(200).json();
  })
);

module.exports = trustRouter;
