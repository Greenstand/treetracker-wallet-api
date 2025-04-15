const Joi = require('joi');
const TrustRelationshipEnums = require('../../utils/trust-enums');

const walletGetQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .message('limit can only be non-negative integer')
    .min(1)
    .message('limit can only be non-negative integer')
    .max(2000)
    .default(1000),
  offset: Joi.number()
    .integer()
    .message('offset can only be non-negative integer')
    .min(0)
    .message('offset can only be non-negative integer')
    .default(0),
  name: Joi.string(),
  sort_by: Joi.string().valid('created_at', 'name').default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  created_at_start_date: Joi.date().iso(),
  created_at_end_date: Joi.date().iso(),
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
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(2000).default(500),
  sort_by: Joi.string()
    .valid('state', 'created_at', 'updated_at')
    .default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().optional(),
});

const walletPostSchema = Joi.object({
  wallet: Joi.string()
    .required()
    .max(254)
    .min(3)
    .trim(true)
    .regex(new RegExp('^[A-Za-z0-9-@.]+$'))
    .message('wallet can only contain numbers, letters and the - . @ symbols'),
  about: Joi.string(),
});

const walletPatchSchema = Joi.object({
  display_name: Joi.string().trim().min(2).max(30),
  about: Joi.string().min(5).max(250),
  add_to_web_map: Joi.boolean().default(false),
});

const walletBatchCreateBodySchema = Joi.object({
  sender_wallet: Joi.string(),
  token_transfer_amount_default: Joi.number().integer(),
}).with('token_transfer_amount_default', 'sender_wallet');

const csvValidationSchema = Joi.array()
  .items(
    Joi.object({
      wallet_name: Joi.string().trim().required(),
      token_transfer_amount_overwrite: [
        Joi.number().integer(),
        Joi.string().valid(''),
      ],
      extra_wallet_data_about: Joi.string(),
    }),
  )
  .unique('wallet_name')
  .min(1)
  .max(2500);

const csvValidationSchemaTransfer = Joi.array()
  .items(
    Joi.object({
      wallet_name: Joi.string().trim().required(),
      token_transfer_amount_overwrite: [
        Joi.number().integer(),
        Joi.string().valid(''),
      ],
    }),
  )
  .unique('wallet_name')
  .min(1)
  .max(2500);

const walletBatchTransferBodySchema = Joi.object({
  sender_wallet: Joi.string().required(),
  token_transfer_amount_default: Joi.number().integer(),
}).with('token_transfer_amount_default', 'sender_wallet');

module.exports = {
  walletGetQuerySchema,
  walletIdParamSchema,
  walletGetTrustRelationshipsSchema,
  walletPostSchema,
  walletPatchSchema,
  walletBatchCreateBodySchema,
  csvValidationSchema,
  csvValidationSchemaTransfer,
  walletBatchTransferBodySchema,
};
