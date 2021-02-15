const express = require('express');
const helper = require('./utils');
const WalletService = require("../services/WalletService");
const TokenService = require("../services/TokenService");
const TrustService = require("../services/TrustService");
const Joi = require("joi");
const Session = require("../models/Session");

const walletRouter = express.Router();

walletRouter.get('/', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const session = new Session();
    const walletService = new WalletService(session);
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const subWallets = await loggedInWallet.getSubWallets();
    //myself
    subWallets.push(loggedInWallet);
    
    const walletsJson = [];

    const tokenService = new TokenService(session);
    for (const wallet of subWallets) {
      const json = await wallet.toJSON();
      json.tokens_in_wallet = await tokenService.countTokenByWallet(wallet); 
      // Hide unnecessary fields 
      delete json.password;
      delete json.salt;
      delete json.type;
      walletsJson.push(json);
    }

    res.status(200).json({
      wallets: walletsJson
    });
  })
);

// Don't need this route anymore?

walletRouter.get('/:wallet_id/trust_relationships', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const session = new Session();
    const trustService = new TrustService(session);
    const walletService = new WalletService(session);
    const wallet = await walletService.getById(req.params.wallet_id);
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
  })
); 

walletRouter.post('/', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    Joi.assert(
      req.body,
      Joi.object({
        wallet: Joi.string().required(),
      })
    );
    const session = new Session();
    const walletService = new WalletService(session);
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const addedWallet = await loggedInWallet.addManagedWallet(req.body.wallet);

    res.status(200).json({
      wallet: addedWallet.name
    });
  })
)


module.exports = walletRouter;
