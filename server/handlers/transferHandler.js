const Joi = require('joi');
const WalletService = require('../services/WalletService');
const TransferService = require('../services/TransferService');
const TokenService = require('../services/TokenService');
const HttpError = require('../utils/HttpError');
const Transfer = require('../models/Transfer');
const Session = require('../database/Session');

const transferPostSchema = Joi.alternatives()
  // if there is tokens field
  .conditional(
    Joi.object({
      tokens: Joi.any().required(),
    }).unknown(),
    {
      then: Joi.object({
        tokens: Joi.array().items(Joi.string()).required().unique(),
        sender_wallet: Joi.alternatives().try(Joi.string()).required(),
        receiver_wallet: Joi.alternatives().try(Joi.string()).required(),
        // TODO: add boolean for claim, but default to false.
        claim: Joi.boolean(),
      }),
      otherwise: Joi.object({
        bundle: Joi.object({
          bundle_size: Joi.number().min(1).max(10000).integer(),
        }).required(),
        sender_wallet: Joi.string().required(),
        receiver_wallet: Joi.string().required(),
        claim: Joi.boolean().required(),
      }),
    },
  );

const transferIdParamSchema = Joi.object({
  transfer_id: Joi.string().guid().required(),
});

const transferIdFulfillSchema = Joi.alternatives()
  // if there is tokens field
  .conditional(
    Joi.object({
      tokens: Joi.any().required(),
    }).unknown(),
    {
      then: Joi.object({
        tokens: Joi.array().items(Joi.string()).required().unique(),
      }),
      otherwise: Joi.object({
        implicit: Joi.boolean().truthy().required(),
      }),
    },
  );

const transferLimitOffsetQuerySchema = Joi.object({
  limit: Joi.number().min(1).max(1000).required(),
  offset: Joi.number().min(0).integer().default(0),
});

const transferGetQuerySchema = Joi.object({
  state: Joi.string().valid(...Object.values(Transfer.STATE)),
  wallet: Joi.alternatives().try(Joi.string(), Joi.number().min(4).max(32)),
  limit: Joi.number().min(1).max(1000).required(),
  offset: Joi.number().min(0).integer().default(0),
});

const transferPost = async (req, res) => {
  await transferPostSchema.validateAsync(req.body, { abortEarly: false });
  const session = new Session();

  // begin transaction
  try {
    await session.beginTransaction();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const walletSender = await walletService.getByIdOrName(
      req.body.sender_wallet,
    );
    const walletReceiver = await walletService.getByIdOrName(
      req.body.receiver_wallet,
    );
    // check if this transfer is a claim (claim == not transferrrable tokens)
    const { claim } = req.body;

    let result;
    // TODO: put the claim boolean into each tokens
    if (req.body.tokens) {
      const tokens = [];
      const tokenService = new TokenService(session);
      for (const id of req.body.tokens) {
        const token = await tokenService.getById(id);
        tokens.push(token);
      }
      // Case 1: with trust, token transfer
      result = await walletLogin.transfer(
        walletSender,
        walletReceiver,
        tokens,
        claim,
      );
    } else {
      // Case 2: with trust, bundle transfer
      // TODO: get only transferrable tokens
      result = await walletLogin.transferBundle(
        walletSender,
        walletReceiver,
        req.body.bundle.bundle_size,
        claim,
      );
    }
    const transferService = new TransferService(session);
    result = await transferService.convertToResponse(result);
    if (result.state === Transfer.STATE.completed) {
      res.status(201).json(result);
    } else if (
      result.state === Transfer.STATE.pending ||
      result.state === Transfer.STATE.requested
    ) {
      res.status(202).json(result);
    } else {
      throw new Error(`Unexpected state ${result.state}`);
    }
    await session.commitTransaction();
  } catch (e) {
    if (e instanceof HttpError && !e.shouldRollback()) {
      // if the error type is HttpError, means the exception has been handled
      await session.commitTransaction();
      throw e;
    } else {
      // unknown exception, rollback the transaction
      await session.rollbackTransaction();
      throw e;
    }
  }
};

const transferIdAcceptPost = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const session = new Session();
  // begin transaction
  try {
    await session.beginTransaction();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);

    // TODO: claim
    const transferJson = await walletLogin.acceptTransfer(
      req.params.transfer_id,
    );
    const transferService = new TransferService(session);
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
    await session.commitTransaction();
  } catch (e) {
    if (e instanceof HttpError && !e.shouldRollback()) {
      // if the error type is HttpError, means the exception has been handled
      await session.commitTransaction();
      throw e;
    } else {
      // unknown exception, rollback the transaction
      await session.rollbackTransaction();
      throw e;
    }
  }
};

const transferIdDeclinePost = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  const session = new Session();
  // begin transaction
  try {
    await session.beginTransaction();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferJson = await walletLogin.declineTransfer(
      req.params.transfer_id,
    );
    const transferService = new TransferService(session);
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
    await session.commitTransaction();
  } catch (e) {
    if (e instanceof HttpError && !e.shouldRollback()) {
      // if the error type is HttpError, means the exception has been handled
      await session.commitTransaction();
      throw e;
    } else {
      // unknown exception, rollback the transaction
      await session.rollbackTransaction();
      throw e;
    }
  }
};

const transferIdDelete = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const session = new Session();
  // begin transaction
  try {
    await session.beginTransaction();
    const walletService = new WalletService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    const transferJson = await walletLogin.cancelTransfer(
      req.params.transfer_id,
    );
    const transferService = new TransferService(session);
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
    await session.commitTransaction();
  } catch (e) {
    if (e instanceof HttpError && !e.shouldRollback()) {
      // if the error type is HttpError, means the exception has been handled
      await session.commitTransaction();
      throw e;
    } else {
      // unknown exception, rollback the transaction
      await session.rollbackTransaction();
      throw e;
    }
  }
};

const transferIdFulfill = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  await transferIdFulfillSchema.validateAsync(req.body, { abortEarly: false });

  const session = new Session();
  // begin transaction
  try {
    await session.beginTransaction();
    const walletService = new WalletService(session);
    const transferService = new TransferService(session);
    const walletLogin = await walletService.getById(res.locals.wallet_id);
    let transferJson;
    if (req.body.implicit) {
      transferJson = await walletLogin.fulfillTransfer(req.params.transfer_id);
    } else {
      // load tokens
      const tokens = [];
      const tokenService = new TokenService(session);
      for (const id of req.body.tokens) {
        const token = await tokenService.getById(id);
        tokens.push(token);
      }
      transferJson = await walletLogin.fulfillTransferWithTokens(
        req.params.transfer_id,
        tokens,
      );
    }
    const transferJson2 = await transferService.convertToResponse(transferJson);
    res.status(200).json(transferJson2);
    await session.commitTransaction();
  } catch (e) {
    if (e instanceof HttpError && !e.shouldRollback()) {
      // if the error type is HttpError, means the exception has been handled
      await session.commitTransaction();
      throw e;
    } else {
      // unknown exception, rollback the transaction
      await session.rollbackTransaction();
      throw e;
    }
  }
};

const transferGet = async (req, res) => {
  await transferGetQuerySchema.validateAsync(req.query, { abortEarly: false });

  const { state, wallet, limit, offset } = req.query;
  const session = new Session();
  const walletService = new WalletService(session);
  const walletLogin = await walletService.getById(res.locals.wallet_id);

  let walletTransfer = walletLogin;
  if (wallet) {
    walletTransfer = await walletService.getByIdOrName(wallet);
  }
  // todo fix filtering by wallet, instead of undefined should take a wallet object with getId() function
  const result = await walletTransfer.getTransfers(
    state,
    undefined,
    offset,
    limit,
  );
  const transferService = new TransferService(session);
  const json = [];
  for (const t of result) {
    const j = await transferService.convertToResponse(t);
    json.push(j);
  }

  res.status(200).json({ transfers: json });
};

const transferIdGet = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const session = new Session();
  const walletService = new WalletService(session);
  const transferService = new TransferService(session);
  const walletLogin = await walletService.getById(res.locals.wallet_id);
  const transferObject = await walletLogin.getTransferById(
    req.params.transfer_id,
  );
  const transferJson = await transferService.convertToResponse(transferObject);
  res.status(200).json(transferJson);
};

const transferIdTokenGet = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  await transferLimitOffsetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const { limit, offset } = req.query;
  const session = new Session();
  const walletService = new WalletService(session);
  const walletLogin = await walletService.getById(res.locals.wallet_id);
  const tokens = await walletLogin.getTokensByTransferId(
    req.params.transfer_id,
    Number(limit),
    Number(offset || 0),
  );

  const tokensJson = [];
  for (const token of tokens) {
    const json = await token.toJSON();
    tokensJson.push(json);
  }
  res.status(200).json({
    tokens: tokensJson,
  });
};

module.exports = {
  transferGet,
  transferIdAcceptPost,
  transferIdDeclinePost,
  transferIdDelete,
  transferIdFulfill,
  transferIdGet,
  transferIdTokenGet,
  transferPost,
};
