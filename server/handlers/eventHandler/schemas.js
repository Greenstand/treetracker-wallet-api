const Joi = require('joi');

const eventsGetQuerySchema = Joi.object({
  limit: Joi.number().required(),
  since: Joi.date().iso(),
  wallet: Joi.string(),
});

module.exports = { eventsGetQuerySchema };
