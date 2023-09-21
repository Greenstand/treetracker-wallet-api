const TokenService = require('../../services/TokenService');
const { tokenGetSchema, tokenIdSchema, tokenGetTransactionsByIdSchema } = require('./schemas');

const tokenGet = async (req, res) => {
  const validatedQuery = await tokenGetSchema.validateAsync(req.query, { abortEarly: false });

  const { limit, wallet, offset } = validatedQuery;
  const { wallet_id } = req
  const tokenService = new TokenService();

  const tokens = await tokenService.getTokens({
    wallet,
    limit,
    offset,
    walletLoginId: wallet_id,
  });

  res.status(200).json({
    tokens,
  });
};

const tokenGetById = async (req, res) => {
  const validatedParams = await tokenIdSchema.validateAsync(req.params, {
    abortEarly: false,
  });
  const {id} = validatedParams;
  const {wallet_id} = req
  const tokenService = new TokenService();
  const token = await tokenService.getById({
    id,
    walletLoginId: wallet_id,
  });

  res.status(200).json(token);
};

const tokenGetTransactionsById = async (req, res) => {
  // validate input
  const validatedQuery = await tokenGetTransactionsByIdSchema.validateAsync(req.query, {
    abortEarly: false,
  });
  const { limit, offset } = validatedQuery;
  const validatedParams = await tokenIdSchema.validateAsync(req.params, {
    abortEarly: false,
  });
  const { id } = validatedParams;
  const {wallet_id} = req
  const tokenService = new TokenService();
  const transactions = await tokenService.getTransactions({
    tokenId: id,
    limit,
    offset,
    walletLoginId: wallet_id,
  });
  res.status(200).json({
    history: transactions,
  });
};

module.exports = { tokenGet, tokenGetById, tokenGetTransactionsById };
