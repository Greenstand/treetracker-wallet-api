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

// Two different unreserved transfers from the same wallet, competing for the
// one free token it holds. This is the double spend the fallback could allow:
// separate transfer rows, so nothing conflicts there, only the token selection.
describe('Two unreserved transfers racing for the same free token', () => {
  let bearerTokenB;
  const transferOne = uuid.v4();
  const transferTwo = uuid.v4();

  const pendingRow = (id) => ({
    id,
    originator_wallet_id: seed.wallet.id,
    source_wallet_id: seed.wallet.id,
    destination_wallet_id: seed.walletB.id,
    type: TransferEnums.TYPE.send,
    state: TransferEnums.STATE.pending,
    parameters: { bundle: { bundleSize: 1 } },
    claim: false,
  });

  before(async () => {
    await seed.clear();
    await seed.seed();
    bearerTokenB = seed.walletB.keycloak_account_id;
    await knex('transfer').insert([
      pendingRow(transferOne),
      pendingRow(transferTwo),
    ]);
  });

  it('the sender holds exactly one free token', async () => {
    const free = await knex('token').where({
      wallet_id: seed.wallet.id,
      transfer_pending: false,
    });
    expect(free).lengthOf(1);
  });

  it('exactly one of the two accepts succeeds', async () => {
    const accept = (id) =>
      request(server)
        .post(`/transfers/${id}/accept`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${bearerTokenB}`);

    const results = await Promise.all([
      accept(transferOne),
      accept(transferTwo),
    ]);
    const succeeded = results.filter((r) => r.statusCode === 200);
    expect(succeeded).lengthOf(1);
    // The loser hit a serialization failure, which is transient, not an error.
    const lost = results.find((r) => r.statusCode !== 200);
    expect(lost.statusCode).eq(409);
  });

  it('the token moved once, and only once', async () => {
    const moved = await knex('token').where({ wallet_id: seed.walletB.id });
    expect(moved).lengthOf(1);
  });
});

// The fallback reads free tokens, so without a lock two accepts racing on the
// same transfer could both select the same rows and spend them twice.
describe('Accept the same unreserved transfer twice at once', () => {
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

  it('exactly one accept succeeds', async () => {
    const accept = () =>
      request(server)
        .post(`/transfers/${transferId}/accept`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${bearerTokenB}`);

    const results = await Promise.all([accept(), accept()]);
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes[0]).eq(200);
    expect(codes[1]).to.not.eq(200);
  });

  it('only one token moved', async () => {
    const moved = await knex('token').where({ wallet_id: seed.walletB.id });
    expect(moved).lengthOf(1);
  });
});
