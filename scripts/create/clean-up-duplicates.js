const csv = require('async-csv');
const fs = require('fs').promises;

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

  const csvFile = './duplicate.uuid.csv'


  const trx = await knex.transaction();

  try {


    const csvString = await fs.readFile(csvFile, 'utf-8');
    const rows = await csv.parse(csvString);

    for(row of rows){
      console.log(row)


      const uuid = row[0]
      console.log(uuid)

      const captures = await trx('trees').select(['id']).where({ uuid, active: true})
      console.log(captures.length)
      captures.shift() // skip the first one

      for(capture of captures){
        csonole.log('set false');
        console.log(capture.id)
        await trx('trees').where({ id: capture.id }).update({active: false})
      }

    }


    await trx.commit();
    // await trx.rollback();

    knex.destroy()

  } catch (error) {

    console.log('error')
    console.log(error)
    await trx.rollback()
    knex.destroy()

  }


})().catch(e => console.error(e.stack));
