// const request = require('supertest');
// const express = require('express');
// const sinon = require('sinon');
// const chai = require('chai');
// const sinonChai = require('sinon-chai');
// const uuid = require('uuid');
// const trustRouter = require('./trustRouter');
// const { errorHandler, apiKeyHandler } = require('../utils/utils');

// chai.use(sinonChai);
// const { expect } = chai;
// const ApiKeyService = require('../services/ApiKeyService');
// const WalletService = require('../services/WalletService');
// const TrustService = require('../services/TrustService');
// const JWTService = require('../services/JWTService');
// const Wallet = require('../models/Wallet');
// const TrustRelationshipEnums = require('../utils/trust-enums');

// describe('trustRouter', () => {
//   let app;
//   const authenticatedWallet = new Wallet(uuid.v4());

//   beforeEach(() => {
//     sinon.stub(ApiKeyService.prototype, 'check');
//     sinon.stub(JWTService.prototype, 'verify').returns({
//       id: authenticatedWallet.getId(),
//     });
//     app = express();
//     app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
//     app.use(express.json()); // parse application/json
//     app.use(apiKeyHandler, trustRouter);
//     app.use(errorHandler);
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   describe('post /trust_relationships', () => {
//     const walletId = uuid.v4();
//     const wallet = new Wallet(walletId);

//     it('successfully', async () => {
//       sinon
//         .stub(WalletService.prototype, 'getById')
//         .resolves(authenticatedWallet);
//       sinon.stub(WalletService.prototype, 'getByName').resolves(wallet);
//       const fn = sinon.stub(Wallet.prototype, 'requestTrustFromAWallet');
//       sinon.stub(TrustService.prototype, 'convertToResponse').resolves({});
//       const res = await request(app).post('/trust_relationships').send({
//         trust_request_type: 'send',
//         requestee_wallet: walletId,
//       });
//       expect(res).property('statusCode').eq(200);
//       expect(fn).calledWith('send', authenticatedWallet, wallet);
//     });

//     it('missed parameters', async () => {
//       const res = await request(app).post('/trust_relationships').send({});
//       expect(res).property('statusCode').eq(422);
//     });

//     it('missed parameters', async () => {
//       const res = await request(app).post('/trust_relationships').send({
//         trust_request_type: 'send',
//       });
//       expect(res).property('statusCode').eq(422);
//     });

//     it('wrong parameters', async () => {
//       sinon.stub(WalletService.prototype, 'getByName').resolves(wallet);
//       sinon.stub(WalletService.prototype, 'getById').resolves(wallet);
//       const res = await request(app).post('/trust_relationships').send({
//         trust_request_type: 'sendError',
//         requestee_wallet: 'wallet',
//       });
//       expect(res).property('statusCode').eq(422);
//     });
//   });

//   describe('get /trust_relationships', () => {
//     const walletId = uuid.v4();
//     const trustId = uuid.v4();

//     it('successfully', async () => {
//       sinon
//         .stub(WalletService.prototype, 'getById')
//         .resolves(new Wallet(walletId));
//       sinon
//         .stub(TrustService.prototype, 'convertToResponse')
//         .resolves({ id: trustId });
//       const fn = sinon
//         .stub(Wallet.prototype, 'getTrustRelationships')
//         .resolves([{}]);
//       const res = await request(app).get(
//         `/trust_relationships?type=${TrustRelationshipEnums.ENTITY_TRUST_TYPE.send}&request_type=${TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send}&state=${TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted}&limit=1`,
//       );
//       expect(res).property('statusCode').eq(200);
//       expect(res.body.trust_relationships).lengthOf(1);
//       expect(fn).calledWith(
//         TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//         TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//       );
//     });

//     it('limit and offset working successfully', async () => {
//       // TODO: need to update the test
//       sinon
//         .stub(WalletService.prototype, 'getById')
//         .resolves(new Wallet(walletId));
//       sinon
//         .stub(TrustService.prototype, 'convertToResponse')
//         .resolves({ id: trustId });
//       const fn = sinon
//         .stub(Wallet.prototype, 'getTrustRelationships')
//         .resolves([{}, {}, {}]);
//       const res = await request(app).get(
//         `/trust_relationships?type=${TrustRelationshipEnums.ENTITY_TRUST_TYPE.send}&request_type=${TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send}&state=${TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted}&limit=3`,
//       );

//       expect(fn).calledWith(
//         TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
//         TrustRelationshipEnums.ENTITY_TRUST_TYPE.send,
//         TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send,
//         0,
//         3,
//       );
//       expect(res).property('statusCode').eq(200);
//       expect(res.body.trust_relationships).lengthOf(3);
//     });

//     // TODO
//     it.skip('wrong state string should throw 422', () => {});

//     // TODO
//     it.skip('wrong type string should throw 422', () => {});

//     // TODO
//     it.skip('wrong request_type string should throw 422', () => {});
//   });
// });
