const express = require('express');
const trustRouter = express.Router();
const { check, validationResult } = require('express-validator');
const assert = require("assert");
const WalletService = require("../services/WalletService");
const TrustService = require("../services/TrustService");
const Wallet = require("../models/Wallet");
const expect = require("expect-runtime");
const helper = require("./utils");

trustRouter.get('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    expect(res.locals).property("wallet_id").number();
    const walletService = new WalletService();
    const trustService = new TrustService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const trust_relationships = await wallet.getTrustRelationships(
      req.query.state,
      req.query.type,
      req.query.request_type,
    );
    const trust_relationships_json = [];
    for(let t of trust_relationships){
      const j = await trustService.convertToResponse(t);
      trust_relationships_json.push(j);
    }
    res.status(200).json({
      trust_relationships: trust_relationships_json,
    });
  }),
);

trustRouter.post('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals.wallet_id).number();
    expect(req).property("body").property("trust_request_type").a(expect.any(String));
    expect(req).property("body").property("requestee_wallet").a(expect.any(String));
    const walletService = new WalletService();
    const trustService = new TrustService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const trust_relationship = await wallet.requestTrustFromAWallet(
      req.body.trust_request_type,
      req.body.requestee_wallet,
    );
    const trust_relationship_json = await trustService.convertToResponse(trust_relationship);
    res.status(200).json(trust_relationship_json);
  })
);

trustRouter.post('/:trustRelationshipId/accept',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals).property("wallet_id").number();
    expect(req.params).property("trustRelationshipId").defined();
    const trustRelationshipId = parseInt(req.params.trustRelationshipId);
    const walletService = new WalletService();
    const trustService = new TrustService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const json = await wallet.acceptTrustRequestSentToMe(trustRelationshipId);
    const json2 = await trustService.convertToResponse(json);
    res.status(200).json(json2);
  })
);

trustRouter.post('/:trustRelationshipId/decline',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals).property("wallet_id").number();
    expect(req.params).property("trustRelationshipId").defined();
    const trustRelationshipId = parseInt(req.params.trustRelationshipId);
    const walletService = new WalletService();
    const trustService = new TrustService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const json = await wallet.declineTrustRequestSentToMe(trustRelationshipId);
    const json2 = await trustService.convertToResponse(json);
    res.status(200).json(json2);
  })
);

trustRouter.delete('/:trustRelationshipId',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res) => {
    expect(res.locals).property("wallet_id").number();
    expect(req.params).property("trustRelationshipId").defined();
    const trustRelationshipId = parseInt(req.params.trustRelationshipId);
    const walletService = new WalletService();
    const trustService = new TrustService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const json = await wallet.cancelTrustRequestSentToMe(trustRelationshipId);
    const json2 = await trustService.convertToResponse(json);
    res.status(200).json(json2);
  })
);

module.exports = trustRouter;
