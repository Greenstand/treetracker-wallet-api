const relationshipController = {};
const knex = require("../database/knex");

relationshipController.get = async (req, res, next) => {
  const result = await knex.select()
    .table("entity_truest");
  res.locals.relationships = result;
}

module.exports = relationshipController;
