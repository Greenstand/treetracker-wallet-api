const csvtojson = require('csvtojson');

const WalletService = require('../../services/WalletService');
const TrustService = require('../../services/TrustService');

const {
  walletGetQuerySchema,
  walletIdParamSchema,
  walletGetTrustRelationshipsSchema,
  walletPostSchema,
  walletPatchSchema,
  walletBatchCreateBodySchema,
  csvValidationSchema,
  walletBatchTransferBodySchema,
  csvValidationSchemaTransfer,
} = require('./schemas');

const walletGet = async (req, res) => {
  const validatedQuery = await walletGetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });
  const walletService = new WalletService();

  const {
    name,
    limit,
    offset,
    sort_by,
    order,
    created_at_start_date,
    created_at_end_date,
  } = validatedQuery;

  const { wallet_id } = req;

  const { wallets, count } = await walletService.getAllWallets(
    wallet_id,
    {
      limit,
      offset,
    },
    name,
    sort_by,
    order,
    created_at_start_date,
    created_at_end_date,
  );

  res.status(200).json({
    total: count,
    query: { ...validatedQuery, limit, offset },
    wallets,
  });
};

const walletSingleGet = async (req, res) => {
  const validatedParams = await walletIdParamSchema.validateAsync(req.params, {
    abortEarly: false,
  });

  const { wallet_id } = validatedParams;
  const walletService = new WalletService();
  const wallet = await walletService.getWallet(wallet_id);
  res.status(200).send(wallet);
};

const walletGetTrustRelationships = async (req, res) => {
  const validatedParams = await walletIdParamSchema.validateAsync(req.params, {
    abortEarly: false,
  });
  const validatedQuery = await walletGetTrustRelationshipsSchema.validateAsync(
    req.query,
    {
      abortEarly: false,
    },
  );

  const { wallet_id } = validatedParams;
  const { state, type, request_type } = validatedQuery;
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
  const validatedBody = await walletPostSchema.validateAsync(req.body, {
    abortEarly: false,
  });

  const { wallet_id } = req;
  const { wallet: walletToBeCreated, about } = validatedBody;
  const walletService = new WalletService();
  const returnedWallet = await walletService.createWallet(
    wallet_id,
    walletToBeCreated,
    about,
  );

  res.status(201).json(returnedWallet);
};

const walletPatch = async (req, res) => {
  const validatedBody = await walletPatchSchema.validateAsync(req.body, {
    abortEarly: false,
  });

  const { wallet_id } = req;
  const { about, logo_url, cover_url } = validatedBody;
  const walletService = new WalletService();
  const returnedWallet = await walletService.updateWallet(
    wallet_id,
    about,
    logo_url,
    cover_url,
  );

  res.status(200).json(returnedWallet);
};

const walletBatchCreate = async (req, res) => {
  const validatedBody = await walletBatchCreateBodySchema.validateAsync(
    req.body,
    { abortEarly: false },
  );

  const { path } = req.file;
  const jsonResult = await csvtojson().fromFile(path);
  const validatedCsvFile = await csvValidationSchema.validateAsync(jsonResult, {
    abortEarly: false,
  });

  const { sender_wallet, token_transfer_amount_default } = validatedBody;
  const { wallet_id } = req;
  const walletService = new WalletService();

  const result = await walletService.batchCreateWallet(
    sender_wallet,
    token_transfer_amount_default,
    wallet_id,
    validatedCsvFile,
    path,
  );

  res.status(201).send(result);
};

const walletBatchTransfer = async (req, res) => {
  const validatedBody = await walletBatchTransferBodySchema.validateAsync(
    req.body,
    { abortEarly: false },
  );

  const { path } = req.file;
  const jsonResult = await csvtojson().fromFile(path);
  const validatedCsvFile = await csvValidationSchemaTransfer.validateAsync(
    jsonResult,
    {
      abortEarly: false,
    },
  );

  const { sender_wallet, token_transfer_amount_default } = validatedBody;
  const { wallet_id } = req;
  const walletService = new WalletService();

  const result = await walletService.batchTransferWallet(
    sender_wallet,
    token_transfer_amount_default,
    wallet_id,
    validatedCsvFile,
    path,
  );

  res.status(200).send(result);
};

module.exports = {
  walletPost,
  walletPatch,
  walletGetTrustRelationships,
  walletGet,
  walletSingleGet,
  walletBatchCreate,
  walletBatchTransfer,
};