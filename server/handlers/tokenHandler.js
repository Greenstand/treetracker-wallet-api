const Joi = require('joi');
const TokenService = require('../services/TokenService');
const WalletService = require('../services/WalletService');
const HttpError = require('../utils/HttpError');
const Session = require('../models/Session');

const tokenGet = async (req, res, _next) => {
  Joi.assert(
    req.query,
    Joi.object({
      limit: Joi.number().min(1).max(1000).required().default(1000),
      offset: Joi.number().min(0).integer().default(0),
      wallet: Joi.string(),
    }),
  );
  const { limit, wallet, offset } = req.query;
  const session = new Session();
  const tokenService = new TokenService(session);
  const walletService = new WalletService(session);
  const walletLogin = await walletService.getById(res.locals.wallet_id);
  let tokens = [];

  if (wallet) {
    const walletInstance = await walletService.getByName(wallet);
    const isSub = await walletLogin.hasControlOver(walletInstance);
    if (!isSub) {
      throw new HttpError(403, 'Wallet does not belong to wallet logged in');
    }
    tokens = await tokenService.getByOwner(walletInstance, limit, offset);
  } else {
    tokens = await tokenService.getByOwner(walletLogin, limit, offset);
  }

  const tokensJson = [];
  for (const token of tokens) {
    const json = await token.toJSON();
    tokensJson.push(json);
  }
  res.status(200).json({
    tokens: tokensJson,
  });
};

const tokenGetById = async (req, res, next) => {
  const { id } = req.params;
  const session = new Session();
  const tokenService = new TokenService(session);
  const walletService = new WalletService(session);
  const token = await tokenService.getById(id);
  // check permission
  const json = await token.toJSON();
  const walletLogin = await walletService.getById(res.locals.wallet_id);
  let walletIds = [walletLogin.getId()];
  const subWallets = await walletLogin.getSubWallets();
  walletIds = [...walletIds, ...subWallets.map((e) => e.getId())];
  if (walletIds.includes(json.wallet_id)) {
    // pass
  } else {
    throw new HttpError(401, 'Have no permission to visit this token');
  }
  res.status(200).json(json);
};

const tokenGetTransactionsById = async (req, res, next) => {
  // validate input
  Joi.assert(
    req.query,
    Joi.object({
      limit: Joi.number().min(1).max(1000).integer().default(1000).required(),
      offset: Joi.number().min(0).integer(),
      id: Joi.string().guid(),
      transactions: Joi.string(),
    }),
  );
  const { limit, offset } = req.query;

  const session = new Session();
  const { id } = req.params;
  const tokenService = new TokenService(session);
  const walletService = new WalletService(session);
  const token = await tokenService.getById(id);
  // check permission
  const json = await token.toJSON();
  const walletLogin = await walletService.getById(res.locals.wallet_id);
  let walletIds = [walletLogin.getId()];
  const subWallets = await walletLogin.getSubWallets();
  walletIds = [...walletIds, ...subWallets.map((e) => e.getId())];
  if (walletIds.includes(json.wallet_id)) {
    // pass
  } else {
    throw new HttpError(401, 'Have no permission to visit this token');
  }
  const transactions = await token.getTransactions(limit, offset);

  const response = [];
  for (const t of transactions) {
    const transaction = await tokenService.convertToResponse(t);
    response.push(transaction);
  }

  res.status(200).json({
    history: response,
  });
};

module.exports = { tokenGet, tokenGetById, tokenGetTransactionsById };
