const Joi = require('joi');
const TrustRelationshipEnums = require('../../utils/trust-enums');

const walletGetQuerySchema = Joi.object({
  limit: Joi.number().required(),
  offset: Joi.number().integer(),
  sortField: Joi.string(),
  sortOrder: Joi.string(),
});

const walletIdParamSchema = Joi.object({
  wallet_id: Joi.string().uuid().required(),
});

const walletGetTrustRelationshipsSchema = Joi.object({
  state: Joi.string().valid(
    ...Object.values(TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE),
  ),
  type: Joi.string().valid(
    ...Object.values(TrustRelationshipEnums.ENTITY_TRUST_TYPE),
  ),
  request_type: Joi.string().valid(
    ...Object.values(TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE),
  ),
});

const walletPostSchema = Joi.object({
  wallet: Joi.string().required(),
});

module.exports = {
  walletGetQuerySchema,
  walletIdParamSchema,
  walletGetTrustRelationshipsSchema,
  walletPostSchema,
};
