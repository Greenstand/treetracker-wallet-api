const express = require('express');
const helper = require('./utils');
const WalletService = require("../services/WalletService");
const TrustService = require("../services/TrustService");
const Joi = require("joi");

const walletRouter = express.Router();

walletRouter.get('/', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const walletService = new WalletService();
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const subWallets = await loggedInWallet.getSubWallets();
    
    const walletsJson = [];

    for (const wallet of subWallets) {
      const json = await wallet.toJSON();
      walletsJson.push(json);
    }

    res.status(200).json({
      wallets: walletsJson
    });
  })
);

// TO DO: Add below route to yaml 

walletRouter.get('/:wallet_id/trust_relationships', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const trustService = new TrustService();
    const walletService = new WalletService();
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
    const walletService = new WalletService();
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const addedWallet = await loggedInWallet.addManagedWallet(req.body.wallet);

    res.status(200).json({
      wallet: addedWallet.name
    });
  })
)


module.exports = walletRouter;
