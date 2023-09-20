const WalletService = require('../../services/WalletService');
const TrustService = require('../../services/TrustService');

const {
  walletGetQuerySchema,
  walletIdParamSchema,
  walletGetTrustRelationshipsSchema,
  walletPostSchema,
} = require('./schemas');

const walletGet = async (req, res) => {
  const validatedQuery = await walletGetQuerySchema.validateAsync(req.query, { abortEarly: false });
  const walletService = new WalletService();

  const { name, limit, offset } = validatedQuery;
  const {wallet_id} = req
  const { wallets, count } = await walletService.getAllWallets(
    wallet_id,
    {
      limit,
      offset,
    },
    name,
  );

  res.status(200).json({
    total: count,
    query: { ...validatedQuery, limit, offset },
    wallets,
  });
};

const walletSingleGet = async (req, res) => {
  const validatedParams = await walletIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const { wallet_id } = validatedParams
  const walletService = new WalletService();
  const wallet = await walletService.getWallet(wallet_id);
  res.status(200).send(wallet);
};

const walletGetTrustRelationships = async (req, res) => {
  const validatedParams = await walletIdParamSchema.validateAsync(req.params, { abortEarly: false });
  const validatedQuery = await walletGetTrustRelationshipsSchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const {wallet_id} = validatedParams
  const {state, type, request_type} = validatedQuery
  const trustService = new TrustService();
  const trust_relationships = await trustService.getTrustRelationships({
    walletId: wallet_id,
    state,
    type,
    request_type,
  });
  res.status(200).json({
    trust_relationships,
  });
};

const walletPost = async (req, res) => {
  const validatedBody = await walletPostSchema.validateAsync(req.body, { abortEarly: false });

  const {wallet_id} = req
  const {wallet: walletToBeCreated} = validatedBody
  const walletService = new WalletService();
  const { wallet, id } = await walletService.createWallet(
    wallet_id,
    walletToBeCreated,
  );

  res.status(201).json({
    id,
    wallet,
  });
};

module.exports = {
  walletPost,
  walletGetTrustRelationships,
  walletGet,
  walletSingleGet,
};
