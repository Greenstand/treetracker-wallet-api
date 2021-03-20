function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

(async () => {

  const Knex = require('knex')
  const { v4: uuidv4 } = require('uuid');

  const Config = require('./config/config');
  const knex = Knex({
    client: 'pg',
    connection:  Config.connectionString[process.env.NODE_ENV]
  })


  const trx = await knex.transaction();

  try {

    const wallet = await trx('wallet.wallet').first('*').where({ name: 'KijaniForestry' })
    console.log(wallet)

    const rows = await trx('trees').select('*').whereRaw('planter_id IN (select id from planter where organization_id = ?) AND active = true AND approved = true AND token_id IS NULL', [7])

    for(capture of rows){
        
      //console.log('capture ' + capture.uuid);
      tokenData = {
        capture_id: capture.uuid,
        wallet_id: wallet.id
      }
      const result = await trx('wallet.token').insert(tokenData).returning('id')
      const tokenId = result[0]
      console.log({ id: capture.id })
      console.log({ token_id: tokenId })
      await trx('trees').where({ id: capture.id }).update({ token_id: tokenId })
    }

    await trx.commit();

    knex.destroy()

  } catch (error) {

    console.log(error)
    await trx.rollback()
    knex.destroy()

  }


})().catch(e => console.error(e.stack));
