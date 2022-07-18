const Joi = require('joi');
const TransferService = require('../services/TransferService');
const TransferEnums = require('../utils/transfer-enum');

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
  limit: Joi.number().integer().min(1).max(1000).required(),
  offset: Joi.number().integer().min(0).default(0),
});

const transferGetQuerySchema = Joi.object({
  state: Joi.string().valid(...Object.values(TransferEnums.STATE)),
  wallet: Joi.alternatives().try(Joi.string(), Joi.number().min(4).max(32)),
  limit: Joi.number().min(1).max(1000).required(),
  offset: Joi.number().min(0).integer().default(0),
});

const transferPost = async (req, res) => {
  await transferPostSchema.validateAsync(req.body, { abortEarly: false });
  const transferService = new TransferService();

  const { result, status } = await transferService.initiateTransfer(
    req.body,
    req.wallet_id,
  );

  res.status(status).send(result);
};

const transferIdAcceptPost = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.acceptTransfer(
    req.params.transfer_id,
    req.wallet_id,
  );

  res.json(result);
};

const transferIdDeclinePost = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.declineTransfer(
    req.params.transfer_id,
    req.wallet_id,
  );

  res.json(result);
};

const transferIdDelete = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.cancelTransfer(
    req.params.transfer_id,
    req.wallet_id,
  );

  res.json(result);
};

const transferIdFulfill = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  await transferIdFulfillSchema.validateAsync(req.body, { abortEarly: false });

  const transferService = new TransferService();

  const result = await transferService.fulfillTransfer(
    req.wallet_id,
    req.params.transfer_id,
    req.body,
  );
  res.json(result);
};

const transferGet = async (req, res) => {
  await transferGetQuerySchema.validateAsync(req.query, { abortEarly: false });

  const transferService = new TransferService();
  const transfers = await transferService.getByFilter(req.query, req.wallet_id);

  res.status(200).json({ transfers });
};

const transferIdGet = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.getTransferById(
    req.params.transfer_id,
    req.wallet_id,
  );
  res.json(result);
};

const transferIdTokenGet = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  await transferLimitOffsetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const { limit, offset } = req.query;

  const transferService = new TransferService();
  const tokens = await transferService.getTokensByTransferId(
    req.params.transfer_id,
    limit,
    offset,
  );

  res.json({ tokens });
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
