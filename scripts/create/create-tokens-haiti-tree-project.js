require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

(async () => {
  const Knex = require('knex');
  const { v4: uuidv4 } = require('uuid');

  const knex = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
  });

  const walletName = 'TheHaitiTreeProject';
  const entityId = 194;
  const dryRun = false;

  const trx = await knex.transaction();

  try {
    const wallet = await trx('wallet.wallet')
      .first('*')
      .where({ name: walletName });
    console.log(wallet);

    let remaining = true;

    while (remaining) {
      const rows = await trx('trees')
        .select('*')
        .whereRaw(
          'planter_id IN (select id from planter where organization_id IN ( select entity_id from getEntityRelationshipChildren(?) ) ) AND active = true AND approved = true AND token_id IS NULL limit 3000',
          [entityId],
        );

      if (rows.length < 3000) {
        remaining = false;
      }

      for (capture of rows) {
        // console.log('capture ' + capture.uuid);
        tokenData = {
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

    if (!dryRun) {
      await trx.commit();
    } else {
      console.log('dry run');
      await trx.rollback();
    }

    knex.destroy();
  } catch (error) {
    console.log(error);
    await trx.rollback();
    knex.destroy();
  }
})().catch((e) => console.error(e.stack));
