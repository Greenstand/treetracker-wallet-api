
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

(async () => {
  const Knex = require('knex');
  const { v4: uuidv4 } = require('uuid');

  const Config = require('./config/config');
  const knex = Knex({
    client: 'pg',
    connection: Config.connectionString[process.env.NODE_ENV],
  });

  const walletName = 'GreenEarthAppeal';
  const dryRun = false;

  const trx = await knex.transaction();

  try {
    const destinationWallet = await trx('wallet.wallet')
      .first('*')
      .where({ name: walletName });
    console.log(destinationWallet);

    const sourceWallet = await trx('entity')
      .first('*')
      .where({ wallet: walletName });
    console.log(sourceWallet);

    let mapping = {}
    mapping[sourceWallet.id] = destinationWallet.id;

    // create all subwallets 
    const subwallets = await trx('entity_manager')
      .join('entity', 'entity.id', '=', 'entity_manager.child_entity_id')
      .where({ parent_entity_id: sourceWallet.id });
    for( subwallet of subwallets){
      console.log(subwallet.wallet);

     const v1Wallet = await trx('wallet.wallet')
      .insert(
        {
          name: subwallet.wallet
        }
      ).returning('*');
      console.log(v1Wallet);

      // and create trust relationship with GreenEarthAppeal
      const trust = await trx('wallet.wallet_trust')
      .insert(
        {
          actor_wallet_id: destinationWallet.id,
          target_wallet_id: v1Wallet[0].id,
          type: 'manage',
          originator_wallet_id: destinationWallet.id,
          request_type: 'manage',
          state: 'trusted',
          active: true
        }
      ).returning('*');
      console.log(trust);

    }

  // in both cases transactions will need to be recreated

    if (dryRun === true) {
      console.log('Dry run: rolling back');
      await trx.rollback();
    } else {
      console.log('Committing changes!');
      await trx.commit();
    }

    knex.destroy();
  } catch (error) {
    console.log(error);
    await trx.rollback();
    knex.destroy();
  }
})().catch((e) => console.error(e.stack));
