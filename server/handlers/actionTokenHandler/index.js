const ActionTokenService = require('../../services/ActionTokenService');
const {
  actionTokenGenerateSchema,
  actionTokenRedeemSchema,
  actionTokenListQuerySchema,
  actionTokenIdParamSchema,
} = require('./schemas');

const actionTokenGenerate = async (req, res) => {
  const validatedBody = await actionTokenGenerateSchema.validateAsync(
    req.body,
    { abortEarly: false },
  );
  const { wallet_id } = req;

  const actionTokenService = new ActionTokenService();
  const result = await actionTokenService.generate(validatedBody, wallet_id);

  res.status(201).json(result);
};

const actionTokenRedeem = async (req, res) => {
  const validatedBody = await actionTokenRedeemSchema.validateAsync(req.body, {
    abortEarly: false,
  });
  const { wallet_id } = req;

  const actionTokenService = new ActionTokenService();
  const result = await actionTokenService.redeem(validatedBody, wallet_id);

  res.status(200).json(result);
};

const actionTokenList = async (req, res) => {
  const validatedQuery = await actionTokenListQuerySchema.validateAsync(
    req.query,
    { abortEarly: false },
  );
  const { wallet_id } = req;

  const actionTokenService = new ActionTokenService();
  const { action_tokens, total } = await actionTokenService.list(
    wallet_id,
    validatedQuery,
  );

  res.status(200).json({ action_tokens, query: validatedQuery, total });
};

const actionTokenCancel = async (req, res) => {
  const { id } = await actionTokenIdParamSchema.validateAsync(req.params, {
    abortEarly: false,
  });
  const { wallet_id } = req;

  const actionTokenService = new ActionTokenService();
  const result = await actionTokenService.cancel(id, wallet_id);

  res.status(200).json(result);
};

module.exports = {
  actionTokenGenerate,
  actionTokenRedeem,
  actionTokenList,
  actionTokenCancel,
};
