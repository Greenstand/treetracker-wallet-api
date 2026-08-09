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
      tokens: Joi.array().items(Joi.string().uuid()).required().unique(),
    }),
    otherwise: Joi.object({
      recipient_email: Joi.string().email().required(),
      bundle: Joi.object({
        bundle_size: Joi.number().integer().min(1).max(10000).required(),
      }).required(),
    }),
  },
);

const actionTokenRedeemSchema = Joi.object({
  action_token: Joi.string().required(),
});

module.exports = { actionTokenGenerateSchema, actionTokenRedeemSchema };
