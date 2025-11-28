const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const uuid = require('uuid');
const eventRouter = require('../routes/eventRouter');
const { errorHandler } = require('../utils/utils');

chai.use(sinonChai);
const { expect } = chai;
const ApiKeyService = require('../services/ApiKeyService');
const JWTService = require('../services/JWTService');
const EventService = require('../services/EventService');
const EventEnums = require('../utils/event-enum');


describe ('eventRouter', () => {
    let app;
    const authenticatedWalletId = uuid.v4();

    beforeEach(() => {
        sinon.stub(ApiKeyService.prototype, 'check');
        sinon.stub(JWTService, 'verify').returns({
            id: authenticatedWalletId,
        });
        app = express();
        app.use(express.urlencoded({extended: false}));
        app.use(express.json());
        app.use(eventRouter);
        app.use(errorHandler);
    })
  
    afterEach(() => {
      sinon.restore();
    });

    describe('GET /events', () => {
        it('missing parameters -- no limit parameter', async() => {
            const res = await request(app).get('/events');
            expect(res).property('statusCode').eq(422);
            expect(res.body.message).match(/limit.*required/);
        })

        it('wrong parameters -- wrong date format', async() => {
            const res = await request(app).get('/events?limit=10&since=test');
            expect(res).property('statusCode').eq(422);
            expect(res.body.message).match(/since.*format/);
        })

        it('get all events sucessfully', async() => {
            const mockEvents = [
                {
                    id: 'event1Id',
                    wallet_id: 'walletId',
                    type: EventEnums.AUTH.login,
                    payload: {}
                },
                
                {
                    id: 'event2Id',
                    wallet_id: 'walletId',
                    type: EventEnums.TRANSFER.transfer_completed,
                    payload: {}
                }
            ];

            const getAllEventsStub = sinon
                .stub(EventService.prototype, 'getAllEvents')
                .resolves(mockEvents);
            
            const res = await request(app).get(
                '/events?limit=10&since=2021-10-05T14:48:00.000Z&wallet=wallet1');
            
            expect(res).property('statusCode').eql(200);
            expect(res.body.events).lengthOf(2);
            expect(res.body.events).eql(mockEvents);
            expect(getAllEventsStub.calledOnceWithExactly({
                wallet: 'wallet1',
                limit: '10',
                since: '2021-10-05T14:48:00.000Z', 
                walletLoginId: authenticatedWalletId
            })).eql(true);

        })
    })
})