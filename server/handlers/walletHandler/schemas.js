const Joi = require('joi');
const TrustRelationshipEnums = require('../../utils/trust-enums');

const walletGetQuerySchema = Joi.object({
  limit: Joi.number()
      .integer().message('limit can only be non-negative integer')
      .min(0).message('limit can only be non-negative integer')
      .max(Number.MAX_SAFE_INTEGER).message('limit value overflow'),
  offset: Joi.number()
      .integer().message('offset can only be non-negative integer')
      .min(0).message('offset can only be non-negative integer')
      .max(Number.MAX_SAFE_INTEGER).message('offset value overflow'),
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
  wallet: Joi.string()
    .required()
    .max(50)
    .min(3)
    .trim(true)
    .regex(new RegExp('^[A-Za-z0-9-@.]+$'))
    .message('wallet can only contain numbers, letters and the - . @ symbols'),
});

module.exports = {
  walletGetQuerySchema,
  walletIdParamSchema,
  walletGetTrustRelationshipsSchema,
  walletPostSchema,
};
