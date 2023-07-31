const TrustService = require('../../services/TrustService');
const {
  trustRelationshipIdSchema,
  trustPostSchema,
  trustGetQuerySchema,
} = require('./schemas');

const trustGet = async (req, res) => {
  await trustGetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const {
    state,
    type,
    request_type,
    // limit, offset
  } = req.query;
  const trustService = new TrustService();
  const trustRelationships = await trustService.getAllTrustRelationships({
    walletId: req.wallet_id,
    state,
    type,
    request_type,
    // offset,
    // limit,
  });

  res.status(200).json({
    trust_relationships: trustRelationships,
  });
};

const trustPost = async (req, res) => {
  // need to add to the events table
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
  // need to add to the events table
  await trustRelationshipIdSchema.validateAsync(req.params, {
    abortEarly: false,
  });

  const { trustRelationshipId } = req.params;
  const trustService = new TrustService();
  const json = await trustService.acceptTrustRequestSentToMe({
    trustRelationshipId,
    walletLoginId: req.wallet_id,
  });
  res.json(json);
};

const trustRelationshipDecline = async (req, res) => {
  // need to add to the events table
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
  // need to add to the events table
  await trustRelationshipIdSchema.validateAsync(req.params, {
    abortEarly: false,
  });

  const { trustRelationshipId } = req.params;
  const trustService = new TrustService();
  const json = await trustService.cancelTrustRequest({
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
