const AuthService = require('../../services/AuthService');
const HttpError = require('../../utils/HttpError');

const { authPostSchema } = require('./schemas');

const authPost = async (req, res) => {
  await authPostSchema.validateAsync(req.body, { abortEarly: false });
  const { wallet, password } = req.body;

  const token = await AuthService.signIn({ wallet, password });
  if (!token) throw new HttpError(401, 'Invalid Credentials');

  res.json({ token });
};

module.exports = { authPost };
