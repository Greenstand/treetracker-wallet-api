const Joi = require('joi');

const tokenGetSchema = Joi.object({
  limit: Joi.number().min(1).max(1000).required().default(1000),
  offset: Joi.number().min(0).integer().default(0),
  wallet: Joi.string(),
});

const tokenGetTransactionsByIdSchema = Joi.object({
  limit: Joi.number().min(1).max(1000).integer().default(1000).required(),
  offset: Joi.number().min(0).integer(),
  id: Joi.string().guid(),
  transactions: Joi.string(),
});

module.exports = {
  tokenGetSchema,
  tokenGetTransactionsByIdSchema,
};
