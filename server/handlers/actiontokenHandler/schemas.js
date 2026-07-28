const Joi = require('joi');

// Define the schema for validation
const actiontokenGenerateSchema = Joi.object({
  email_id: Joi.string().email().required(),
  limit: Joi.number().integer().min(1).max(10).required(), // Adjust the max limit as needed
});

const actionTokenTransferSchema = Joi.object({
  actionToken: Joi.string().required()
});

module.exports = {actiontokenGenerateSchema,actionTokenTransferSchema}