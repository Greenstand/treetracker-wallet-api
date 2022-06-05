const Joi = require('joi');
const WalletService = require('../services/WalletService');
const TokenService = require('../services/TokenService');
const TrustService = require('../services/TrustService');
const Session = require('../database/Session');

const walletGetQuerySchema = Joi.object({
  limit: Joi.number().required(),
  offset: Joi.number().integer(),
});

const walletPostSchema = Joi.object({
  wallet: Joi.string().required(),
});

const walletGet = async (req, res) => {
  await walletGetQuerySchema.validateAsync(req.query, { abortEarly: false });
  const walletService = new WalletService();

  const { limit, offset } = req.query;
  const wallets = await walletService.getAllWallets(req.wallet_id, {
    limit,
    offset,
  });

  res.status(200).json({ wallets });
};

const walletGetTrustRelationships = async (req, res) => {
  const trustService = new TrustService();
  const trust_relationships = await trustService.getTrustRelationships({
    walletId: req.params.wallet_id,
    state: req.query.state,
    type: req.query.type,
    request_type: req.query.request_type,
  });
  res.status(200).json({
    trust_relationships,
  });
};

const walletPost = async (req, res) => {
  await walletPostSchema.validateAsync(req.body, { abortEarly: false });

  const walletService = new WalletService();
  const wallet = await walletService.createWallet(
    req.wallet_id,
    req.body.wallet,
  );

  res.status(200).json({
    wallet,
  });
};

module.exports = { walletPost, walletGetTrustRelationships, walletGet };
