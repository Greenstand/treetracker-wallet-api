const Joi = require('joi');
const HttpError = require('../utils/HttpError');
const TrustRelationshipEnums = require('../utils/trust-enums');
const BaseRepository = require('./BaseRepository');

class StripeUserRepository extends BaseRepository {
    constructor(session) {
        super('public.stripe_user', session);
        this._tableName = 'public.stripe_user';
        this._session = session;
    }

    async getByUserId(userId){
        const stripeUser = await this._session
            .getDB()
            .select()
            .table(this._tableName)
            .where('user_id', userId)
            .first();
        
        return stripeUser
    }

    async create(userId, stripeCustomerId) {
        const object = {
            user_id: userId, 
            stripe_customer_id: stripeCustomerId,
        }
        const result = await this._session
            .getDB()
            .with('inserted', (qb) => {
                qb.insert(object).into(this._tableName).returning('*');
            })
            .select('*').
            from('inserted');
    
        return result[0];
    }
}

module.exports = StripeUserRepository


/*
CREATE TABLE stripe_user (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,
    stripe_customer_id TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_stripe_user_user_id
ON stripe_user (user_id);

CREATE INDEX idx_stripe_user_stripe_customer_id
ON stripe_user (stripe_customer_id);
*/