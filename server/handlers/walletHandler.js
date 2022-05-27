const Joi = require('joi');
const _ = require('lodash');
const WalletService = require('../services/WalletService');
const TokenService = require('../services/TokenService');
const TrustService = require('../services/TrustService');
const Session = require('../database/Session');

const walletGetQuerySchema = Joi.object({
  limit: Joi.number().required(),
  offset: Joi.number().min(1).integer(),
});

const walletPostSchema = Joi.object({
  wallet: Joi.string().required(),
});

const walletGet = async (req, res, next) => {
  await walletGetQuerySchema.validateAsync(req.query, { abortEarly: false });

  const { limit, offset } = req.query;
  const session = new Session();
  const walletService = new WalletService(session);
  const loggedInWallet = await walletService.getById(res.locals.wallet_id);
  const subWallets = await loggedInWallet.getSubWallets();
  // at logged in wallets to list of wallets
  subWallets.push(loggedInWallet);

  let walletsJson = [];

  const tokenService = new TokenService(session);
  for (const wallet of subWallets) {
    const json = await wallet.toJSON();
    json.tokens_in_wallet = await tokenService.countTokenByWallet(wallet);
    walletsJson.push(json);
  }

  const numStart = parseInt(offset);
  const numLimit = parseInt(limit);
  const numBegin = numStart ? numStart - 1 : 0;
  const numEnd = numBegin + numLimit;
  walletsJson = walletsJson.slice(numBegin, numEnd);

  res.status(200).json({
    wallets: walletsJson.map((wallet) =>
      _.omit(wallet, ['password', 'type', 'salt']),
    ),
  });
};

const walletGetTrustRelationships = async (req, res, next) => {
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
  for (const t of trust_relationships) {
    const j = await trustService.convertToResponse(t);
    trust_relationships_json.push(j);
  }
  res.status(200).json({
    trust_relationships: trust_relationships_json,
  });
};

const walletPost = async (req, res, next) => {
  await walletPostSchema.validateAsync(req.body, { abortEarly: false });
  const session = new Session();
  const walletService = new WalletService(session);
  const loggedInWallet = await walletService.getById(res.locals.wallet_id);
  const addedWallet = await loggedInWallet.addManagedWallet(req.body.wallet);

  res.status(200).json({
    wallet: addedWallet.name,
  });
};

module.exports = { walletPost, walletGetTrustRelationships, walletGet };
