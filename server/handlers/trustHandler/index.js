const TrustService = require('../../services/TrustService');
const {
  trustRelationshipIdSchema,
  trustPostSchema,
  trustGetQuerySchema,
} = require('./schemas');

const trustGet = async (req, res) => {
  const validatedQuery = await trustGetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const { state, type, request_type, limit, offset } = validatedQuery;

  const accessToken = req.user;
  const { wallet_id } = accessToken;

  const trustService = new TrustService();
  const {
    result: trust_relationships,
    count: total,
  } = await trustService.getAllTrustRelationships({
    walletId: wallet_id,
    state,
    type,
    request_type,
    offset,
    limit,
  });

  res.status(200).json({
    trust_relationships,
    query: { limit, offset },
    total,
  });
};

const trustPost = async (req, res) => {
  const validatedBody = await trustPostSchema.validateAsync(req.body, {
    abortEarly: false,
  });

  const {
    requestee_wallet,
    requester_wallet,
    trust_request_type,
  } = validatedBody;

  const accessToken = req.user;
  const { wallet_id } = accessToken;

  const trustService = new TrustService();
  const trustRelationship = await trustService.createTrustRelationship({
    walletLoginId: wallet_id,
    requesteeWallet: requestee_wallet,
    requesterWallet: requester_wallet,
    trustRequestType: trust_request_type,
  });

  res.status(201).json(trustRelationship);
};

const trustRelationshipGetById = async (req, res) => {
  const validatedParams = await trustRelationshipIdSchema.validateAsync(
    req.params,
    {
      abortEarly: false,
    },
  );

  const { trustRelationshipId } = validatedParams;

  const accessToken = req.user;
  const { wallet_id } = accessToken;

  const trustService = new TrustService();
  const trustRelationship = await trustService.trustRelationshipGetById({
    walletLoginId: wallet_id,
    trustRelationshipId,
  });

  res.status(200).json(trustRelationship);
};

const trustRelationshipAccept = async (req, res) => {
  const validatedParams = await trustRelationshipIdSchema.validateAsync(
    req.params,
    {
      abortEarly: false,
    },
  );

  const { trustRelationshipId } = validatedParams;

  const accessToken = req.user;
  const { wallet_id } = accessToken;

  const trustService = new TrustService();
  const json = await trustService.acceptTrustRequestSentToMe({
    trustRelationshipId,
    walletLoginId: wallet_id,
  });
  res.status(200).json(json);
};

const trustRelationshipDecline = async (req, res) => {
  const validatedParams = await trustRelationshipIdSchema.validateAsync(
    req.params,
    {
      abortEarly: false,
    },
  );

  const { trustRelationshipId } = validatedParams;

  const accessToken = req.user;
  const { wallet_id } = accessToken;

  const trustService = new TrustService();
  const json = await trustService.declineTrustRequestSentToMe({
    walletLoginId: wallet_id,
    trustRelationshipId,
  });
  res.status(200).json(json);
};

const trustRelationshipDelete = async (req, res) => {
  const validatedParams = await trustRelationshipIdSchema.validateAsync(
    req.params,
    {
      abortEarly: false,
    },
  );

  const { trustRelationshipId } = validatedParams;

  const accessToken = req.user;
  const { wallet_id } = accessToken;

  const trustService = new TrustService();
  const json = await trustService.cancelTrustRequest({
    walletLoginId: wallet_id,
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
  trustRelationshipGetById,
};
