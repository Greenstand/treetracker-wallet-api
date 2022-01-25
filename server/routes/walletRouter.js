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
    console.warn("get wallet...");
    Joi.assert(
      req.query,
      Joi.object({
        limit: Joi.number().required(),
        start: Joi.number().min(1).max(10000).integer(),
      })
    );
    const {limit, start} = req.query;
    const loggedInWalletId = res.locals.wallet_id;

    function convertStartToOffset(_start){
      return _start ? _start - 1 : 0;
    }
    async function getWallets(walletId, _limit, _offset){
      console.warn("getWallet with SQL", walletId, _limit, _offset);
      const knex = require("../database/knex");
      const SQL = `
        with wallet_ids as (
        (select '${walletId}' as sub_wallet_id) 
        union
        (
        select target_wallet_id as sub_wallet_id from 
        wallet_trust wt
        where 
          wt.actor_wallet_id = '${walletId}' and 
          wt.request_type = 'manage' and
          wt.state = 'trusted')
        union
        (
        select actor_wallet_id as sub_wallet_id from
        wallet_trust wt
        where
          wt.target_wallet_id = '${walletId}' and
          wt.request_type = 'yield' and
          wt.state = 'trusted'
        )
        )
        select w.id, name, logo_url, count(t.id) tokens_in_wallet 
        from wallet w 
        left join token t
        on w.id = t.wallet_id
        where w.id in (select sub_wallet_id from wallet_ids)
        group by w.id, w.name, w.logo_url 
        limit ${_limit} offset ${_offset};
      `
      console.warn("SQL", SQL);
      const result = await knex.raw(SQL)
      console.warn("get result with rows:", result.rows.length);
      return result.rows;
    }
    const wallets = await getWallets(loggedInWalletId, limit, convertStartToOffset(start));
    res.status(200).json({
      // tokens: tokensJson,
      wallets,
    });
    return;

    const session = new Session();
    const walletService = new WalletService(session);
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const subWallets = await loggedInWallet.getSubWallets();
    // at logged in wallets to list of wallets
    subWallets.push(loggedInWallet);
    console.warn("sub...", subWallets);
    
    let walletsJson = [];

    const tokenService = new TokenService(session);
    for (const wallet of subWallets) {
      const json = await wallet.toJSON();
      json.tokens_in_wallet = await tokenService.countTokenByWallet(wallet); 
      walletsJson.push(json);
    }

    let numStart = parseInt(start);
    let numLimit = parseInt(limit);
    let numBegin = numStart?numStart-1:0;
    let numEnd=numBegin+numLimit;
    walletsJson = walletsJson.slice(numBegin, numEnd);

    console.warn("get wallet:", walletsJson);
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
