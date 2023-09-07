const Joi = require('joi');

const authPostSchema = Joi.object({
  wallet: Joi.alternatives().try(Joi.string(), Joi.string().uuid()).required(),
  password: Joi.string().max(32).required(),
}).unknown(false);

module.exports = { authPostSchema };
