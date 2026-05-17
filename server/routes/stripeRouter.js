const express = require('express');
const StripeService = require('../services/StripeService')

const router = express.Router();
const routerWrapper = express.Router();

const createCheckout = async (req, res) => {
    const checkoutUrl = await new StripeService(123).createCheckout()
    res.status(200).json(checkoutUrl);
}

const verifyCheckout = async (req, res) => {
    const webhookData = req.body;
    const dataSignature = req.headers['stripe-signature']
    await new StripeService(123).verifyCheckout(webhookData, dataSignature)
    res.status(200).json({});
}

router.get('/getCheckout', createCheckout);
router.post('/verifyCheckout', verifyCheckout);

routerWrapper.use('/stripe', router);
module.exports = routerWrapper;
