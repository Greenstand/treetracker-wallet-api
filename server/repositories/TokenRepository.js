const knex = require('../database/knex');
const config = require('../../config/config');

class TokenRepository{
  constructor(){
  }

  async getByUUID(uuid){
    //NOTE raw returns original PG result
    const result = await knex.raw(`SELECT token.*, image_url, lat, lon, 
    tree_region.name AS region_name,
    trees.time_created AS tree_captured_at
    FROM token
    JOIN public.trees AS trees
    ON trees.id = token.tree_id
    LEFT JOIN (
      SELECT DISTINCT  name, tree_id
      FROM public.tree_region AS tree_region
      JOIN public.region AS region
      ON region.id = tree_region.region_id
      WHERE zoom_level = 4
    ) tree_region
    ON tree_region.tree_id = trees.id 
    WHERE token.uuid = ?`,[uuid]);

    console.error("xxxx:", result);
    const trees = [];
    for(let token of result.rows){
      let treeItem = {
        token: token.uuid,
        map_url: config.map_url + "?treeid="+token.tree_id,
        image_url: token.image_url,
        tree_captured_at: token.tree_captured_at,
        latitude: token.lat,
        longitude: token.lon,
        region: token.region_name
      }
      trees.push(treeItem);
    }
    return trees;
  }

}

module.exports = TokenRepository;
