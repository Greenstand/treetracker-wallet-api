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
        tokens: Joi.array().items(Joi.string().uuid()).required().unique(),
        sender_wallet: Joi.alternatives()
          .try(Joi.string(), Joi.string().uuid())
          .required()
          .invalid(Joi.ref('receiver_wallet'))
          .messages({
            'any.invalid':
              'Cannot transfer to the same wallet as the originating one!',
          }),
        receiver_wallet: Joi.alternatives()
          .try(Joi.string(), Joi.string().uuid())
          .required(),
        claim: Joi.boolean().default(false),
      }),
      otherwise: Joi.object({
        bundle: Joi.object({
          bundle_size: Joi.number().integer().min(1).max(10000),
        }).required(),
        sender_wallet: Joi.alternatives()
          .try(Joi.string(), Joi.string().uuid())
          .required()
          .invalid(Joi.ref('receiver_wallet'))
          .messages({
            'any.invalid':
              'Cannot transfer to the same wallet as the originating one!',
          }),
        receiver_wallet: Joi.alternatives()
          .try(Joi.string(), Joi.string().uuid())
          .required(),
        claim: Joi.boolean().default(false),
      }),
    },
  );

const transferIdParamSchema = Joi.object({
  transfer_id: Joi.string().uuid().required(),
});

const transferIdFulfillSchema = Joi.alternatives()
  // if there is tokens field
  .conditional(
    Joi.object({
      tokens: Joi.any().required(),
    }).unknown(),
    {
      then: Joi.object({
        tokens: Joi.array().items(Joi.string().uuid()).required().unique(),
      }),
      otherwise: Joi.object({
        implicit: Joi.boolean().valid(true).required(),
      }),
    },
  );

const transferLimitOffsetQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(2000).default(1000),
  offset: Joi.number().integer().min(0).default(0),
});

const transferGetQuerySchema = Joi.object({
  state: Joi.string().valid(...Object.values(TransferEnums.STATE)),
  wallet: Joi.alternatives().try(Joi.string(), Joi.string().uuid()),
  before: Joi.date().iso(),
  after: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(2000).default(1000),
  offset: Joi.number().integer().min(0).default(0),
  sort_by: Joi.string()
    .valid(...Object.values(TransferEnums.SORT))
    .optional(),
  order: Joi.string().valid('desc', 'asc').optional(),
});

module.exports = {
  transferGetQuerySchema,
  transferLimitOffsetQuerySchema,
  transferIdFulfillSchema,
  transferIdParamSchema,
  transferPostSchema,
};
