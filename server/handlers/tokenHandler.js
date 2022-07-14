const Joi = require('joi');
const TokenService = require('../services/TokenService');

const tokenGetSchema = Joi.object({
  limit: Joi.number().min(1).max(1000).required().default(1000),
  offset: Joi.number().min(0).integer().default(0),
  wallet: Joi.string(),
});

const tokenGetTransactionsByIdSchema = Joi.object({
  limit: Joi.number().min(1).max(1000).integer().default(1000).required(),
  offset: Joi.number().min(0).integer(),
  id: Joi.string().guid(),
  transactions: Joi.string(),
});

const tokenGet = async (req, res) => {
  await tokenGetSchema.validateAsync(req.query, { abortEarly: false });

  const { limit, wallet, offset } = req.query;
  const tokenService = new TokenService();

  const tokens = await tokenService.getTokens({
    wallet,
    limit,
    offset,
    walletLoginId: req.wallet_id,
  });

  res.status(200).json({
    tokens,
  });
};

const tokenGetById = async (req, res) => {
  const { id } = req.params;
  const tokenService = new TokenService();
  const token = await tokenService.getById({
    id,
    walletLoginId: req.wallet_id,
  });

  res.status(200).json(token);
};

const tokenGetTransactionsById = async (req, res) => {
  // validate input
  await tokenGetTransactionsByIdSchema.validateAsync(req.query, {
    abortEarly: false,
  });
  const { limit, offset } = req.query;
  const { id } = req.params;
  const tokenService = new TokenService();
  const transactions = await tokenService.getTransactions({
    tokenId: id,
    limit,
    offset,
    walletLoginId: req.wallet_id,
  });
  res.status(200).json({
    history: transactions,
  });
};

module.exports = { tokenGet, tokenGetById, tokenGetTransactionsById };
