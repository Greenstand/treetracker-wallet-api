const Joi = require('joi');
const TransferEnums = require('../../utils/transfer-enum');

const transferPostSchema = Joi.alternatives()
  // if there is tokens field
  .conditional(
    Joi.object({
      tokens: Joi.any().required(),
    }).unknown(),
    {
      then: Joi.object({
        tokens: Joi.array().items(Joi.string()).required().unique(),
        sender_wallet: Joi.alternatives().try(Joi.string()).required().invalid(Joi.ref('receiver_wallet')).messages({
          'any.invalid': 'Cannot transfer to the same wallet as the originating one!'
        }),
        receiver_wallet: Joi.alternatives().try(Joi.string()).required(),
        claim: Joi.boolean().default(false),
      }),
      otherwise: Joi.object({
        bundle: Joi.object({
          bundle_size: Joi.number().min(1).max(10000).integer(),
        }).required(),
        sender_wallet: Joi.string().required().invalid(Joi.ref('receiver_wallet')).messages({
          'any.invalid': 'Cannot transfer to the same wallet as the originating one!'
        }),
        receiver_wallet: Joi.string().required(),
        claim: Joi.boolean().default(false),
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
  before: Joi.date().iso(),
  after: Joi.date().iso(),
  limit: Joi.number().min(1).max(1000),
  offset: Joi.number().min(0).integer().default(0),
});

module.exports = {
  transferGetQuerySchema,
  transferLimitOffsetQuerySchema,
  transferIdFulfillSchema,
  transferIdParamSchema,
  transferPostSchema,
};
