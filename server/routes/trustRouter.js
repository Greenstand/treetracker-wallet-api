const express = require('express');
const trustRouter = express.Router();
const { check, validationResult } = require('express-validator');
const assert = require("assert");
const WalletService = require("../services/WalletService");
const TrustService = require("../services/TrustService");
const Wallet = require("../models/Wallet");
const TrustRelationship = require("../models/TrustRelationship");
const expect = require("expect-runtime");
const HttpError = require("../utils/HttpError");
const helper = require("./utils");
const Session = require("../models/Session");
const Joi = require("joi");

trustRouter.get('/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    expect(res.locals).property("wallet_id").number();
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    let wallet;
    if(req.query.wallet) {
      // check to see if user passed in a wallet name or id (req queries are always default strings)
      let walletQueryParam = Number.isNaN(parseInt(req.query.wallet)) ? req.query.wallet: parseInt(req.query.wallet);
      const queryWallet = await walletService.getByIdOrName(walletQueryParam);
      let isManaged = await loggedInWallet.hasTrust(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.manage, loggedInWallet, queryWallet);
      let isYielded = await loggedInWallet.hasTrust(TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield, queryWallet, loggedInWallet);
      // check if we have right permissions to access the query wallet or the same as logged in wallet
      if(isManaged || isYielded || loggedInWallet._id === queryWallet._id) {          
        wallet = queryWallet;
      }
      else {
        throw new HttpError(401, "Have no permission to access this wallet");
      }
    }
    // otherwise if no passed in wallet query, then will just look at logged in wallet
    wallet = loggedInWallet;
    // get all trust relationships of the logged in wallet (where logged in wallet is the actor/target/originator)
    const trust_relationships = await wallet.getTrustRelationships(
      req.query.state,
      req.query.type,
      req.query.request_type,
    );
    const subWallets = await wallet.getSubWallets();
    // get all trust relationships of wallets managed by logged in wallet 
    for(const sw of subWallets){
      const trustRelationships = await sw.getTrustRelationships(
        req.query.state,
        req.query.type,
        req.query.request_type,
      );
      // avoid duplicates (where subwallet trust ID is the same as one of logged in wallet's trust ID)
      for(tr of trustRelationships){
        if(trust_relationships.every(e => e.id !== tr.id)){
          trust_relationships.push(tr);
        }
      }
    }
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
    Joi.assert(
      req.body,
      Joi.object({
        trust_request_type: Joi.string().required(),
        requester_wallet: Joi.string(),
        requestee_wallet: Joi.string().required(),
      })
    );
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    const wallet = await walletService.getById(res.locals.wallet_id);
    const requesteeWallet = await walletService.getByName(req.body.requestee_wallet);
    let requesterWallet = wallet;
    if(req.body.requester_wallet){
      requesterWallet = await walletService.getByName(req.body.requester_wallet);
    }
    const trust_relationship = await wallet.requestTrustFromAWallet(
      req.body.trust_request_type,
      requesterWallet,
      requesteeWallet,
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
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
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
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
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
    const session = new Session();
    const walletService = new WalletService(session);
    const trustService = new TrustService(session);
    const wallet = await walletService.getById(res.locals.wallet_id);
    const json = await wallet.cancelTrustRequestSentToMe(trustRelationshipId);
    const json2 = await trustService.convertToResponse(json);
    res.status(200).json(json2);
  })
);

module.exports = trustRouter;
