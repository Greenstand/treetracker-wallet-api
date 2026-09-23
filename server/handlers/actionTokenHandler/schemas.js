const Joi = require('joi');


 // Issue: either explicit token ids or a bundle size, plus the recipient email
 // Mirrors the tokens|bundle shape of the transfer POST schema

const actionTokenGenerateSchema = Joi.alternatives().conditional(
  Joi.object({
    tokens: Joi.any().required(),
  }).unknown(),
  {
    then: Joi.object({
      recipient_email: Joi.string().email().required(),
      sender_wallet: Joi.string(),
      tokens: Joi.array().items(Joi.string().uuid()).required().unique(),
    }),
    otherwise: Joi.object({
      recipient_email: Joi.string().email().required(),
      sender_wallet: Joi.string(),
      bundle: Joi.object({
        bundle_size: Joi.number().integer().min(1).max(10000).required(),
      }).required(),
    }),
  },
);

const actionTokenRedeemSchema = Joi.object({
  action_token: Joi.string().required(),
  // Which of the caller's wallets should receive the tokens (id or name).
  // Defaults to the caller's login wallet when omitted (#855).
  wallet: Joi.string(),
});

const actionTokenListQuerySchema = Joi.object({
  state: Joi.string().valid('active', 'redeemed', 'cancelled'),
  limit: Joi.number().integer().min(1).max(2000).default(1000),
  offset: Joi.number().integer().min(0).default(0),
});

const actionTokenIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

module.exports = {
  actionTokenGenerateSchema,
  actionTokenRedeemSchema,
  actionTokenListQuerySchema,
  actionTokenIdParamSchema,
};
