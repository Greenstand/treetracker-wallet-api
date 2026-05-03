const express = require('express');
const StripeService = require('../services/StripeService')

const router = express.Router();
const routerWrapper = express.Router();

const createCheckout = async (req, res) => {
    const checkoutUrl = await new StripeService(123).createCheckout()
    res.status(200).json(checkoutUrl);
}

const verifyCheckout = async (req, res) => {
    await new StripeService(123).verifyCheckout()
    res.status(200).json({});
}

router.get('/getCheckout', createCheckout);
router.get('/verifyCheckout', verifyCheckout);

routerWrapper.use('/stripe', router);
module.exports = routerWrapper;
