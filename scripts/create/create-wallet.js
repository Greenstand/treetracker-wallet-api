require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

(async () => {
  const Knex = require('knex');

  const knex = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
  });

  const Crypto = require('crypto');

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Please provide a username');
    throw new Error('Please provide a username');
  }
  const username = args[0];

  const trx = await knex.transaction();

  try {
    // create wallet and password, salt

    const result = await trx('wallet.wallet')
      .insert({
        name: username,
      })
      .returning('*');
    const wallet = result[0];
    console.log(wallet);

    await trx.commit();

    knex.destroy();

    console.log(`wallet ${username}`);
  } catch (error) {
    console.log(error);
    await trx.rollback();
    knex.destroy();
  }
})().catch((e) => console.error(e.stack));
