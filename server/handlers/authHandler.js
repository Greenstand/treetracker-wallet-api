const Joi = require('joi');
const WalletService = require('../services/WalletService');
const JWTService = require('../services/JWTService');
const Session = require('../models/Session');

const authPostSchema = Joi.object({
  wallet: Joi.string().min(4).max(36).required(),
  password: Joi.string().max(32).required(),
}).unknown(false);

const authPost = async (req, res, next) => {
  await authPostSchema.validateAsync(req.body, { abortEarly: false });

  const { wallet, password } = req.body;
  const session = new Session();
  const walletService = new WalletService(session);

  let walletObject = await walletService.getByIdOrName(wallet);
  walletObject = await walletObject.authorize(password);

  const jwtService = new JWTService();
  const token = jwtService.sign(walletObject);

  res.status(200).json({ token });
};

module.exports = { authPost };
