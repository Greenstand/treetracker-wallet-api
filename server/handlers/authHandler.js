const Joi = require('joi');
const AuthService = require('../services/AuthService');
const HttpError = require('../utils/HttpError');

const authPostSchema = Joi.object({
  wallet: Joi.string().min(4).max(36).required(),
  password: Joi.string().max(32).required(),
}).unknown(false);

const authPost = async (req, res) => {
  await authPostSchema.validateAsync(req.body, { abortEarly: false });
  const { wallet, password } = req.body;

  const token = await AuthService.signIn({ wallet, password });
  if (!token) throw new HttpError(401, 'Invalid Credentials');

  res.status(200).json({ token });
};

module.exports = { authPost };
