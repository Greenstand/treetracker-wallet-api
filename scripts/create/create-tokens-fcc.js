(async () => {
  const Knex = require('knex');
  const { v4: uuidv4 } = require('uuid');

  // eslint-disable-next-line import/no-unresolved
  const Config = require('./config/config');
  const knex = Knex({
    client: 'pg',
    connection: Config.connectionString[process.env.NODE_ENV],
  });

  const trx = await knex.transaction();

  try {
    const wallet = await trx('wallet.wallet').first('*').where({ name: 'FCC' });
    console.log(wallet);

    let remaining = true;

    while (remaining) {
      const rows = await trx('trees')
        .select('*')
        .whereRaw(
          'planter_id IN (select id from planter where organization_id IN ( select entity_id from getEntityRelationshipChildren(?) ) ) AND active = true AND approved = true AND token_id IS NULL limit 3000',
          [178],
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
