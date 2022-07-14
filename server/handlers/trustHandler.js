const Joi = require('joi');
const TrustService = require('../services/TrustService');
const TrustRelationshipEnums = require('../utils/trust-enums');

const trustGetQuerySchema = Joi.object({
  state: Joi.string(),
  type: Joi.string(),
  request_type: Joi.string(),
  offset: Joi.number().min(0).default(0).integer(),
  limit: Joi.number().min(1).max(1000).integer().default(1000),
});

const trustPostSchema = Joi.object({
  trust_request_type: Joi.string()
    .required()
    .valid(...Object.keys(TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE)),
  requestee_wallet: Joi.string().required(),
  requester_wallet: Joi.string(),
});

const trustRelationshipIdSchema = Joi.object({
  trustRelationshipId: Joi.string().required(),
});

const trustGet = async (req, res) => {
  await trustGetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const { state, type, request_type, limit, offset } = req.query;
  const trustService = new TrustService();
  const trustRelationships = await trustService.getAllTrustRelationships({
    walletId: req.wallet_id,
    state,
    type,
    request_type,
    offset,
    limit,
  });

  res.status(200).json({
    trust_relationships: trustRelationships,
  });
};

const trustPost = async (req, res) => {
  await trustPostSchema.validateAsync(req.body, { abortEarly: false });

  const trustService = new TrustService();
  const trustRelationship = await trustService.createTrustRelationship({
    walletLoginId: req.wallet_id,
    requesteeWallet: req.body.requestee_wallet,
    requesterWallet: req.body.requester_wallet,
    trustRequestType: req.body.trust_request_type,
  });

  res.status(200).json(trustRelationship);
};

const trustRelationshipAccept = async (req, res) => {
  await trustRelationshipIdSchema.validateAsync(req.params, {
    abortEarly: false,
  });

  const { trustRelationshipId } = req.params;
  const trustService = new TrustService();
  const json = await trustService.acceptTrustRequestSentToMe({
    trustRelationshipId,
    walletLoginId: req.wallet_id,
  });
  res.status(200).json(json);
};

const trustRelationshipDecline = async (req, res) => {
  await trustRelationshipIdSchema.validateAsync(req.params, {
    abortEarly: false,
  });

  const { trustRelationshipId } = req.params;
  const trustService = new TrustService();
  const json = await trustService.declineTrustRequestSentToMe({
    walletLoginId: req.wallet_id,
    trustRelationshipId,
  });
  res.status(200).json(json);
};

const trustRelationshipDelete = async (req, res) => {
  await trustRelationshipIdSchema.validateAsync(req.params, {
    abortEarly: false,
  });

  const { trustRelationshipId } = req.params;
  const trustService = new TrustService();
  const json = await trustService.cancelTrustRequestSentToMe({
    walletLoginId: req.wallet_id,
    trustRelationshipId,
  });
  res.status(200).json(json);
};

module.exports = {
  trustGet,
  trustPost,
  trustRelationshipAccept,
  trustRelationshipDecline,
  trustRelationshipDelete,
};
