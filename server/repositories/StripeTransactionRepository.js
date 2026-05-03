const Joi = require('joi');
const HttpError = require('../utils/HttpError');
const TrustRelationshipEnums = require('../utils/trust-enums');
const BaseRepository = require('./BaseRepository');

class StripeTransactionRepository extends BaseRepository {
    constructor(session) {
        super('public.stripe_transaction', session);
        this._tableName = 'public.stripe_transaction';
        this._session = session;
    }

    async getById(id){
        const stripeUser = await this._session
            .getDB()
            .select()
            .table(this._tableName)
            .where('id', id)
            .first();
        
        return stripeUser
    }

    async create(stripeUserId) {
        const object = {
            stripe_user_id: stripeUserId, 
            status: 'PENDING'
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

    async updateStatus(id, status) {
        if (['FAILED', 'CANCELLED', 'PAID'].includes(status)){
            return
        }

        const object = {status, update_at: undefined}
        const result = await this._session
            .getDB()
            .with('updated', (qb) => {
                qb.update(object)
                .into(this._tableName)
                .where('id', id)
                .returning('*');
            }) 

            return result[0];
    }
}

module.exports = StripeTransactionRepository


/*
CREATE TYPE stripe_transaction_status AS ENUM (
    'PENDING',
    'FAILED',
    'CANCELLED',
    'PAID'
);

CREATE TABLE stripe_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    stripe_user_id INTEGER NOT NULL,

    status stripe_transaction_status NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_transaction_history
ADD CONSTRAINT fk_stripe_user
FOREIGN KEY (stripe_user_id)
REFERENCES stripe_user(id)
ON DELETE CASCADE;
*/