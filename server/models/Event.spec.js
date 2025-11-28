const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const uuid = require('uuid');
const Event = require('./Event');
const Session = require('../infra/database/Session');
const EventRepository = require('../repositories/EventRepository');
const EventEnums = require('../utils/event-enum');

chai.use(sinonChai);
const { expect } = chai;

describe('Event Model', () => {
    let eventModel;
    let eventRepositoryStub;

    beforeEach(() => {
        const session = new Session();
        eventModel = new Event(session);
        eventRepositoryStub = sinon.stub(EventRepository.prototype);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getAllEvents function', () => {
        const walletId = uuid.v4();
        const filter = {
            and: [],
        };
        filter.and.push({ wallet_id: walletId });

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

        it('should get events', async () => {
            
            eventRepositoryStub.getAllEvents.resolves(mockEvents);
            const result = await eventModel.getAllEvents(walletId, 10);

            expect(result).eql(mockEvents.map(event => ({ ...event})));
            expect(eventRepositoryStub.getAllEvents
                .calledOnceWithExactly(filter, 10)).eql(true);
            
        });

        it('should get events -- since', async () => {

            const mockSince = '2021-10-05T15:00:00.000Z';
            const filterCopy = JSON.parse(JSON.stringify(filter));
            filterCopy.and.push({ after: { 'wallet_event.created_at': mockSince } });

            eventRepositoryStub.getAllEvents.resolves(mockEvents);
            const result = await eventModel.getAllEvents(walletId, 10, mockSince);

            expect(result).eql(mockEvents.map(event => ({ ...event})));
            expect(eventRepositoryStub.getAllEvents
                .calledOnceWithExactly(filterCopy, 10)).eql(true);
            
        });
    });

    it('should log event', async () => {
        const walletId = uuid.v4();
        const mockEvent = {
            id: 'eventId',
            wallet_id: 'walletId',
            type: EventEnums.AUTH.login,
            payload: {}
        };

        eventRepositoryStub.create.resolves(mockEvent)
        
        const result = await eventModel.logEvent({ 
            wallet_id: walletId, 
            type: EventEnums.TRANSFER.transfer_completed,
            payload: {}
        });

        expect(result).eql(mockEvent);
        expect(eventRepositoryStub.create.calledOnceWithExactly({
            wallet_id: walletId,
            type: EventEnums.TRANSFER.transfer_completed,
            payload: {}
        })).eql(true);

    })
});