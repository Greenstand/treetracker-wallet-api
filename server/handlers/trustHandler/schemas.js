const Joi = require('joi');
const TrustRelationshipEnums = require('../../utils/trust-enums');

const trustGetQuerySchema = Joi.object({
  state: Joi.string().valid(
    ...Object.values(TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE),
  ),
  type: Joi.string().valid(
    ...Object.values(TrustRelationshipEnums.ENTITY_TRUST_TYPE),
  ),
  request_type: Joi.string().valid(
    ...Object.values(TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE),
  ),
  offset: Joi.number().min(0).default(0).integer(),
  limit: Joi.number().min(1).max(1000).integer().default(1000),
});

const trustPostSchema = Joi.object({
  trust_request_type: Joi.string()
    .required()
    .valid(...Object.keys(TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE)),
  requestee_wallet: Joi.string()
      .required()
      .invalid(Joi.ref('requester_wallet')).messages({
        'any.invalid': 'Requester and requestee cannot be same.'
      }),
  requester_wallet: Joi.string(),
});

const trustRelationshipIdSchema = Joi.object({
  trustRelationshipId: Joi.string().guid().required(),
});

module.exports = {
  trustRelationshipIdSchema,
  trustPostSchema,
  trustGetQuerySchema,
};
