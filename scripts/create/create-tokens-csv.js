const csv = require('async-csv');
const fs = require('fs').promises;
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

(async () => {
  const Knex = require('knex');
  const { v4: uuidv4 } = require('uuid');

  const knex = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
  });

  const targetWallet = 'GreenstandEscrow';
  const csvFile = './GS_Not_Owned_20210313.csv';
  const dryRun = true;

  const trx = await knex.transaction();

  try {
    const wallet = await trx('wallet.wallet')
      .first('*')
      .where({ name: targetWallet });
    console.log(wallet);

    const csvString = await fs.readFile(csvFile, 'utf-8');
    const rows = await csv.parse(csvString);
    rows.shift();

    for (const row of rows) {
      console.log(row[0]);
      console.log(parseInt(row[0]));

      const captureId = parseInt(row[0]);

      const capture = await trx('trees')
        .select(['uuid', 'token_id', 'active'])
        .where({ id: captureId })
        .first();
      console.log(capture);
      if (capture.token_id) {
        console.log('token already assigned');
        continue;
      }

      if (capture.active === false) {
        console.log('capture is not active');
        continue;
      }

      // console.log('capture ' + capture.uuid);
      const tokenData = {
        capture_id: capture.uuid,
        wallet_id: wallet.id,
      };
      const result = await trx('wallet.token')
        .insert(tokenData)
        .returning('id');
      const tokenId = result[0];
      console.log({ id: capture.uuid });
      console.log({ token_id: tokenId });
      await trx('trees').where({ id: captureId }).update({ token_id: tokenId });
    }

    if (dryRun === true) {
      console.log('Dry run: rolling back');
      await trx.rollback();
    } else {
      console.log('Committing changes!');
      // await trx.commit();
    }

    knex.destroy();
  } catch (error) {
    console.log(error);
    await trx.rollback();
    knex.destroy();
  }
})().catch((e) => console.error(e.stack));
