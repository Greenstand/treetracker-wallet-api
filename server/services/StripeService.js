const Stripe = require("stripe");
const Session = require('../infra/database/Session');

const StripeUserRepository = require('../repositories/StripeUserRepository');
const StripeTransactionRepository = require('../repositories/StripeTransactionRepository');


const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeService {

    constructor(userId){
        this.userId = userId // user tied to Greenstand

        this._session = new Session();
        this._stripeUserRepo = new StripeUserRepository(this._session);
        this._stripeTransactionRepo = new StripeTransactionRepository(this._session)
    }

    async __getOrCreateStripeUser() {
        let stripeUser = await this._stripeUserRepo.getByUserId(this.userId)
        if (!stripeUser){
            // In reality, we should be getting this from the user record
            const userInfo = {name: 'Test User', email: 'testuser@test.com'}
            const customer = await stripe.customers.create(userInfo);

            const stripeCustomerId = customer.id
            stripeUser = await this._stripeUserRepo.create(this.userId, stripeCustomerId)
        }

        return stripeUser
    }

    async __createTransaction(stripeUserId) {
        const transaction = await this._stripeTransactionRepo.create(stripeUserId)
        return transaction
    }

    async __updateTransaction(transactionId, status) {
        const transaction = await this._stripeTransactionRepo.updateStatus(transactionId, status)
        return transaction
    }

    async createCheckout(metaInfo={}) {
        const stripeUser = await this.__getOrCreateStripeUser()
        const stripeTransaction = await this.__createTransaction(stripeUser.id)

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer: stripeUser.stripe_customer_id,
            client_reference_id: stripeTransaction.id,
            metadata: metaInfo,
            success_url: 'http://localhost:3000/home',
            cancel_url: 'http://localhost:3000/home',
            line_items: [
                {   
                    quantity: 1,
                    price_data: { currency: 'usd', unit_amount: 100, product_data: {name: 'token'} },   
                },
            ],
        });

        return checkoutSession.url
    }
    
    async verifyCheckout(webhookData, dataSignature) {
        const event = stripe.webhooks.constructEvent(
            webhookData,
            dataSignature,
            STRIPE_WEBHOOK_SECRET,
        );

        const eventType = event.type;
        const transactionId = event.data.object.client_reference_id;

        if (eventType === 'checkout.session.completed') {
            await this.__updateTransaction(transactionId, 'PAID');
        } else {
            await this.__updateTransaction(transactionId, 'FAILED');
        }

    }
}

module.exports = StripeService