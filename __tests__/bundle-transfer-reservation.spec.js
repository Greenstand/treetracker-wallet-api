// Integration test: v2 must reserve the tokens it promises, and must consume
// a reservation made by another API version rather than freezing it.
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

const { apiKey } = seed;

const login = async (wallet) => {
  const res = await request(server)
    .post('/auth')
    .set('treetracker-api-key', apiKey)
    .send({ wallet: wallet.name, password: wallet.password });
  expect(res).to.have.property('statusCode', 200);
  return res.body.token;
};

const sendBundle = (token, size) =>
  request(server)
    .post('/transfers')
    .set('treetracker-api-key', apiKey)
    .set('Authorization', `Bearer ${token}`)
    .send({
      bundle: { bundle_size: size },
      sender_wallet: seed.wallet.name,
      receiver_wallet: seed.walletB.name,
      claim: false,
    });

describe('Bundle transfer reservations', () => {
  let bearerToken;
  let bearerTokenB;

  beforeEach(async () => {
    await seed.clear();
    await seed.seed();
    bearerToken = await login(seed.wallet);
    bearerTokenB = await login(seed.walletB);
    // The seed gives the sender one token; take it to five.
    await Promise.all(
      [0, 1, 2, 3].map(() => seed.addTokenToWallet(seed.wallet.id)),
    );
  });

  it('a pending send reserves exactly the tokens it promised', async () => {
    const res = await sendBundle(bearerToken, 3);
    expect(res.statusCode).to.be.oneOf([200, 201, 202]);

    const reserved = await knex('token').where({
      wallet_id: seed.wallet.id,
      transfer_pending: true,
    });
    expect(reserved).lengthOf(3);
    reserved.forEach((t) => expect(t.transfer_pending_id).eq(res.body.id));
  });

  it('cannot promise more than the wallet has free', async () => {
    const first = await sendBundle(bearerToken, 4);
    expect(first.statusCode).to.be.oneOf([200, 201, 202]);

    // Only one free token is left, so a second bundle of four is refused.
    const second = await sendBundle(bearerToken, 4);
    expect(second).to.have.property('statusCode', 409);
  });

  it('two concurrent sends cannot reserve the same tokens', async () => {
    const results = await Promise.all([
      sendBundle(bearerToken, 4),
      sendBundle(bearerToken, 4),
    ]);
    const accepted = results.filter((r) =>
      [200, 201, 202].includes(r.statusCode),
    );
    expect(accepted).lengthOf(1);

    const reserved = await knex('token').where({
      wallet_id: seed.wallet.id,
      transfer_pending: true,
    });
    expect(reserved).lengthOf(4);
  });

  it('accepting consumes the reserved tokens, leaving none frozen', async () => {
    const created = await sendBundle(bearerToken, 3);
    const transferId = created.body.id;

    const accept = await request(server)
      .post(`/transfers/${transferId}/accept`)
      .set('treetracker-api-key', apiKey)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(accept).to.have.property('statusCode', 200);

    const moved = await knex('token').where({ wallet_id: seed.walletB.id });
    expect(moved).lengthOf(3);
    moved.forEach((t) => expect(t.transfer_pending).eq(false));

    const stuck = await knex('token').where({
      wallet_id: seed.wallet.id,
      transfer_pending: true,
    });
    expect(stuck).lengthOf(0);
  });

  it('an unreserved transfer from an older version still accepts', async () => {
    const transferId = uuid.v4();
    await knex('transfer').insert({
      id: transferId,
      originator_wallet_id: seed.wallet.id,
      source_wallet_id: seed.wallet.id,
      destination_wallet_id: seed.walletB.id,
      type: TransferEnums.TYPE.send,
      state: TransferEnums.STATE.pending,
      parameters: { bundle: { bundleSize: 2 } },
      claim: false,
    });

    const accept = await request(server)
      .post(`/transfers/${transferId}/accept`)
      .set('treetracker-api-key', apiKey)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(accept).to.have.property('statusCode', 200);

    const moved = await knex('token').where({ wallet_id: seed.walletB.id });
    expect(moved).lengthOf(2);
  });

  it('cancelling releases the reservation', async () => {
    const created = await sendBundle(bearerToken, 3);

    const cancel = await request(server)
      .post(`/transfers/${created.body.id}/decline`)
      .set('treetracker-api-key', apiKey)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${bearerTokenB}`);
    expect(cancel).to.have.property('statusCode', 200);

    const stillReserved = await knex('token').where({
      wallet_id: seed.wallet.id,
      transfer_pending: true,
    });
    expect(stillReserved).lengthOf(0);
  });
});
