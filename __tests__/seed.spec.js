const { expect } = require('chai');
const seed = require('./seed');
const knex = require('../server/infra/database/knex');

describe('Seed data into DB', () => {
  let token;

  before(async () => {
    await seed.clear();
    await seed.seed();
  });

  it('Should find a token', async () => {
    expect(seed.token).to.have.property('id');
    const r = await knex.table('token').select().where('id', seed.token.id);
    expect(r).lengthOf(1);
    [token] = r;
    expect(token).to.have.property('capture_id').to.equal(seed.capture.id);
    expect(token).to.have.property('wallet_id').to.equal(seed.wallet.id);
  });

  it('walletC exists', async () => {
    const r = await knex
      .table('wallet')
      .select()
      .where('name', seed.walletC.name);
    expect(r).lengthOf(1);
  });

  it('walletC have manage relationship with wallet', async () => {
    const r = await knex.table('wallet_trust').select().where({
      actor_wallet_id: seed.walletB.id,
      target_wallet_id: seed.walletC.id,
      type: 'manage',
    });
    expect(r).lengthOf(1);
  });

  it('TokenB', async () => {
    const r = await knex.table('token').select().where('id', seed.tokenB.id);
    expect(r).lengthOf(1);
    expect(r[0]).property('capture_id').eq(seed.captureB.id);
  });
});
