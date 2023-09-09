const Joi = require('joi');

const tokenGetSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(2000).default(2000),
  offset: Joi.number().integer().min(0).default(0),
  wallet: Joi.string(),
});

const tokenGetTransactionsByIdSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(2000).default(1000),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = {
  tokenGetSchema,
  tokenGetTransactionsByIdSchema,
};
