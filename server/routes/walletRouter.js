const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const Joi = require("joi");
const {
  handlerWrapper,
  verifyJWTHandler,
  apiKeyHandler,
} = require('../utils/utils');
const {
  walletGet,
  walletGetTrustRelationships,
  walletPost,
  walletSingleGet,
} = require('../handlers/walletHandler');

router.get('/', handlerWrapper(walletGet));
router.get('/:wallet_id', handlerWrapper(walletSingleGet));

// TO DO: Add below route to yaml
router.get(
  '/:wallet_id/trust_relationships',
  handlerWrapper(walletGetTrustRelationships),
);
router.post('/', handlerWrapper(async (req, res) => {
  Joi.assert(req.body, Joi.object({
    wallet: Joi.string().min(3).max(20).trim(true)
  }))
  await walletPost(req, res);
}));


routerWrapper.use('/wallets', apiKeyHandler, verifyJWTHandler, router);
module.exports = routerWrapper;
