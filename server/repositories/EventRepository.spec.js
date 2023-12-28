const { expect } = require('chai');
const mockKnex = require('mock-knex');
const EventRepository = require('./EventRepository');
const knex = require('../infra/database/knex');

const tracker = mockKnex.getTracker();
const Session = require('../infra/database/Session');


describe('EventRepository', () => {
    let eventRepository;

    beforeEach(() => {
        mockKnex.mock(knex);
        tracker.install();
        eventRepository = new EventRepository(new Session());
    });

    afterEach(() => {
        tracker.uninstall();
        mockKnex.unmock(knex);
    });

    it('getAllEvents', async () => {
        tracker.on('query', (query) => {
            expect(query.sql).match(
                /select.*wallet_event.*/,
            );
            query.response([{}]);
        });
        await eventRepository.getByFilter({});
    });


});