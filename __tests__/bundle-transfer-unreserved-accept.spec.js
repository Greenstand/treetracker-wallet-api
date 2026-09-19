require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const chai = require('chai');
const uuid = require('uuid');
const server = require('../server/app');
const seed = require('./seed');
const knex = require('../server/infra/database/knex');
const TransferEnums = require('../server/utils/transfer-enum');
chai.use(require('chai-uuid'));

// The v1 and v2 APIs share this database and create pending bundle transfers
// without reserving tokens. Accepting one here must still work, so the row is
// inserted directly rather than through POST /transfers, which does reserve.
describe('Accept a pending bundle transfer that reserved no tokens', () => {
  let bearerTokenB;
  const transferId = uuid.v4();

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerTokenB = seed.walletB.keycloak_account_id;

    await knex('transfer').insert({
      id: transferId,
      originator_wallet_id: seed.wallet.id,
      source_wallet_id: seed.wallet.id,
      destination_wallet_id: seed.walletB.id,
      type: TransferEnums.TYPE.send,
      state: TransferEnums.STATE.pending,
      parameters: { bundle: { bundleSize: 1 } },
      claim: false,
    });
  });

  it('the seeded transfer has no reserved tokens', async () => {
    const reserved = await knex('token').where({
      transfer_pending_id: transferId,
    });
    expect(reserved).lengthOf(0);
  });

  it('accepting it succeeds', async () => {
    const res = await request(server)
      .post(`/transfers/${transferId}/accept`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(res).to.have.property('statusCode', 200);
  });

  it('the transfer is completed and a token moved to the receiver', async () => {
    const [transfer] = await knex('transfer').where({ id: transferId });
    expect(transfer.state).eq(TransferEnums.STATE.completed);

    const moved = await knex('token').where({ wallet_id: seed.walletB.id });
    expect(moved).lengthOf(1);
    expect(moved[0].transfer_pending).eq(false);
  });
});
