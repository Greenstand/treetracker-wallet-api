const Stripe = require("stripe");
const Session = require('../infra/database/Session');

const StripeUserRepository = require('../repositories/StripeUserRepository');
const StripeTransactionRepository = require('../repositories/StripeTransactionRepository');


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeService {
    constructor(userId){
        this.userId = userId // user tied to Greenstand

        this._session = new Session();
        this._stripeUserRepo = new StripeUserRepository(this._session);
        this._stripeTransactionRepo = new StripeTransactionRepository(this._session)
    }

    #getOrCreateStripeUser = async () => {
        let stripeUser = await this._stripeUserRepo.getByUserId(this.userId)
        if (!stripeUser){
            // In reality, we should be getting this from the user record
            const userInfo = {name: 'Test User', email: 'testuser@test.com'}
            const customer = await stripe.customers.create(userInfo);

            const stripeCustomerId = customer["id"]
            stripeUser = await this._stripeUserRepo.create(this.userId, stripeCustomerId)
        }

        return stripeUser
    }

    #createTransaction = async (stripeUserId) => {
        return await this._stripeTransactionRepo.create(stripeUserId)
    }

    #updateTransaction = async (transactionId, status) => {
        return await this._stripeTransactionRepo.updateStatus(transactionId, status)
    }

    createCheckout = async (metaInfo={}) => {
        const stripeUser = await this.#getOrCreateStripeUser()
        const stripeTransaction = await this.#createTransaction(stripeUser.id)

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

        console.log(checkoutSession)

        return checkoutSession["url"]
    }
    
    verifyCheckout = async (webhookData) => {
        const transactionId = webhookData["object"]["client_reference_id"]
        await this.#updateTransaction(transactionId, 'PAID')
    }
}

module.exports = StripeService