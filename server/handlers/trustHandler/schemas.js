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
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(2000).default(500),
  sort_by: Joi.string()
    .valid('state', 'created_at', 'updated_at')
    .default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().optional(),
});

const trustPostSchema = Joi.object({
  trust_request_type: Joi.string()
    .required()
    .valid(...Object.keys(TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE)),
  requestee_wallet: Joi.string()
    .required()
    .invalid(Joi.ref('requester_wallet'))
    .messages({
      'any.invalid': 'Requester and requestee cannot be same.',
    }),
  requester_wallet: Joi.string(),
  search: Joi.string().optional(),
});

const trustRelationshipIdSchema = Joi.object({
  trustRelationshipId: Joi.string().uuid().required(),
});

module.exports = {
  trustRelationshipIdSchema,
  trustPostSchema,
  trustGetQuerySchema,
};
