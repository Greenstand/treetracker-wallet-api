const sinon = require('sinon');
const { expect } = require('chai');
const EventService = require('./EventService');
const WalletService = require('./WalletService');
const Event = require('../models/Event');
const EventEnums = require('../utils/event-enum');

describe('EventService', () => {
    let eventService;

    beforeEach(() => {
        eventService = new EventService();
    });

    afterEach(() => {
        sinon.restore();
    })

    describe('getAllEvents', () => {
        
        let getAllEventsStub;
        let hasControlOverByNameStub;
        const walletInstance = {
            id: 'walletId',
            wallet: 'walletInstance'
        };

        beforeEach(() => {
            getAllEventsStub = sinon.stub(Event.prototype, 'getAllEvents');
            hasControlOverByNameStub = sinon
                .stub(WalletService.prototype, 'hasControlOverByName');
        });

        it('getAllEvents with wallet', async () => {
            
            getAllEventsStub.resolves(['event']);
            hasControlOverByNameStub.resolves(walletInstance);
            
            const events = await eventService.getAllEvents({
                wallet: 'wallet', 
                limit: 10,
                since: undefined, 
                walletLoginId: 'walletLoginId'
            });
    
            expect(events).eql(['event']);
            expect(hasControlOverByNameStub.calledOnceWithExactly
                ('walletLoginId', 'wallet')).eql(true);
            expect(getAllEventsStub.calledOnceWithExactly
                (walletInstance.id, 10, undefined)).eql(true);
    
    
        });

        it('getAllEvents without wallet', async () => {

            getAllEventsStub.resolves(['event']);
            
            const events = await eventService.getAllEvents({
                limit: 10,
                since: undefined, 
                walletLoginId: 'walletId'
            });
    
            expect(events).eql(['event']);
            expect(getAllEventsStub.calledOnceWithExactly
                ('walletId', 10, undefined)).eql(true);
    
        });
        
    });

    it('logEvent', async () => {
        const event = {
            id: 'eventId',
            wallet_id: 'walletId',
            type: EventEnums.TRANSFER.transfer_completed,
            payload: {}
        }

        const logEventStub = sinon
            .stub(Event.prototype, 'logEvent')
            .resolves(event);
        
        const result = await eventService.logEvent({
            wallet_id: 'walletId',
            type: EventEnums.TRANSFER.transfer_completed,
            payload: {}
        });

        expect(logEventStub.calledOnceWithExactly({
            wallet_id: 'walletId',
            type: EventEnums.TRANSFER.transfer_completed,
            payload: {}
        })).eql(true);
    
        expect(result).eql(event);
    
    });

});