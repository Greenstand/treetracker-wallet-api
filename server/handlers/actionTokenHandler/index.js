const ActionTokenService = require('../../services/ActionTokenService');
const {
  actionTokenGenerateSchema,
  actionTokenRedeemSchema,
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

module.exports = { actionTokenGenerate, actionTokenRedeem };
