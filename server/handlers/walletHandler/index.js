const WalletService = require('../../services/WalletService');
const TrustService = require('../../services/TrustService');

const {
  walletGetQuerySchema,
  walletIdParamSchema,
  walletGetTrustRelationshipsSchema,
  walletPostSchema,
} = require('./schemas');

const walletGet = async (req, res) => {
  await walletGetQuerySchema.validateAsync(req.query, { abortEarly: false });
  const walletService = new WalletService();

  const { name, limit, offset } = req.query;
  const wallets = await walletService.getAllWallets(
    req.wallet_id,
    {
      limit,
      offset,
    },
    name,
  );
  const walletCount = await walletService.getAllWalletsCount(req.wallet_id, name);

  res.status(200).json({
    total: walletCount,
    wallets,
  });
};

const walletSingleGet = async (req, res) => {
  await walletIdParamSchema.validateAsync(req.params, { abortEarly: false });
  const walletService = new WalletService();

  const wallet = await walletService.getWallet(req.params.wallet_id);
  res.status(200).send(wallet);
};

const walletGetTrustRelationships = async (req, res) => {
  await walletIdParamSchema.validateAsync(req.params, { abortEarly: false });
  await walletGetTrustRelationshipsSchema.validateAsync(req.query, {
    abortEarly: false,
  });
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
  const { wallet, id } = await walletService.createWallet(
    req.wallet_id,
    req.body.wallet,
  );

  res.status(200).json({
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
