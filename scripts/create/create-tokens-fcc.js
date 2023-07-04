(async () => {
  require('dotenv').config();
  const Knex = require('knex');
  const { v4: uuidv4 } = require('uuid');

  // eslint-disable-next-line import/no-unresolved
  // const Config = require('./config/config');
  console.log(process.env.DATABASE_URL);
  const knex = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
  });

  const trx = await knex.transaction();

  try {
    const wallet = await trx('wallet.wallet')
      .first('*')
      .where({ name: 'testuser' });
    console.log(wallet);

    let remaining = true;

    while (remaining) {
      const rows = await trx('trees')
        .select('*')
        .whereRaw(
          'active = true AND approved = true AND token_id IS NULL limit 1000',
        );

      if (rows.length < 3000) {
        remaining = false;
      }

      for (const capture of rows) {
        // console.log('capture ' + capture.uuid);
        const tokenData = {
          capture_id: capture.uuid,
          wallet_id: wallet.id,
        };
        const result = await trx('wallet.token')
          .insert(tokenData)
          .returning('id');
        const tokenId = result[0];
        console.log({ id: capture.id });
        console.log({ token_id: tokenId });
        await trx('trees')
          .where({ id: capture.id })
          .update({ token_id: tokenId });

        const resultt = await trx('treetracker.capture')
          .where({ id: capture.uuid })
          .update({ token_id: tokenId, token_issued: true });

        console.log(resultt);
      }
    }

    await trx.commit();
    // await trx.rollback();

    knex.destroy();
  } catch (error) {
    console.log(error);
    await trx.rollback();
    knex.destroy();
  }
})().catch((e) => console.error(e.stack));
