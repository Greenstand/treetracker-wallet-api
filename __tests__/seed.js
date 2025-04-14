/*
 * seed data to DB for testing
 */
const uuid = require('uuid');
const log = require('loglevel');
const knex = require('../server/infra/database/knex');

const wallet = {
  id: uuid.v4(),
  name: 'walletA',
};

const capture = {
  id: uuid.v4(),
};

const captureB = {
  id: uuid.v4(),
};

const token = {
  id: uuid.v4(),
};

const walletB = {
  id: uuid.v4(),
  name: 'walletB',
};

const walletC = {
  id: uuid.v4(),
  name: 'walletC',
};

const tokenB = {
  id: uuid.v4(),
  capture_id: captureB.id,
  wallet_id: walletC.id,
};

const storyOfThisSeed = `
    a wallet: #${wallet.id}
      name: ${wallet.name}
      wallet: ${wallet.name}

    a capture: #${capture.id}

    a token: #${token.id}
      capture: #${capture.id}
      wallet: #${wallet.id}

    wallet #${wallet.id} planted a capture #${capture.id}, get a token #${
  token.id
}

    walletB: 
      ${JSON.stringify(walletB, undefined, 2)}

    walletC (walletC was managed by walletB:#{walletB.id}): 
      ${JSON.stringify(walletC, undefined, 2)}

    Another token, belongs to walletC:
      ${JSON.stringify(tokenB, undefined, 2)}

    Another capture: #${captureB.id}


`;
log.debug(
  '--------------------------story of database ----------------------------------',
  storyOfThisSeed,
  '-----------------------------------------------------------------------------',
);

async function seed() {
  log.debug('seed api key');
  // TODO should use appropriate hash & salt to populate this table

  // wallet
  await knex('wallet').insert({
    id: wallet.id,
    name: wallet.name,
  });

  // walletB
  await knex('wallet').insert({
    id: walletB.id,
    name: walletB.name,
  });

  // walletC
  await knex('wallet').insert({
    id: walletC.id,
    name: walletC.name,
  });

  // relationships: 'walletB' manage 'walletC'
  await knex('wallet_trust').insert({
    type: 'manage',
    actor_wallet_id: walletB.id,
    target_wallet_id: walletC.id,
    originator_wallet_id: walletB.id,
    request_type: 'manage',
    state: 'trusted',
  });

  // token
  log.log('seed token');
  await knex('token').insert({
    id: token.id,
    capture_id: capture.id,
    wallet_id: wallet.id,
  });

  await knex('token').insert(tokenB);
}

async function addTokenToWallet(walletId) {
  return knex('token').insert(
    {
      id: uuid.v4(),
      capture_id: uuid.v4(),
      wallet_id: walletId,
    },
    ['id'],
  );
}

async function clear() {
  log.debug('clear tables');
  await knex('api_key').del();
  await knex('transaction').del();
  await knex('token').del();
  await knex('wallet').del();
  await knex('wallet_trust').del();
  await knex('transfer').del();
}

module.exports = {
  seed,
  clear,
  wallet,
  walletB,
  walletC,
  capture,
  token,
  tokenB,
  captureB,
  addTokenToWallet,
};
