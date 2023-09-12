const Joi = require('joi');

const authPostSchema = Joi.object({
  wallet: Joi.string().min(3).max(254).required(),
  password: Joi.string().max(32).required(),
}).unknown(false);

module.exports = { authPostSchema };
