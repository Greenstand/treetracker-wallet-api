const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const {
  handlerWrapper,
  verifyJWTHandler,
  apiKeyHandler,
} = require('../utils/utils');
const {
  walletGet,
  walletGetTrustRelationships,
  walletPost,
} = require('../handlers/walletHandler');

router.get('/', handlerWrapper(walletGet));

// TO DO: Add below route to yaml
router.get(
  '/:wallet_id/trust_relationships',
  handlerWrapper(walletGetTrustRelationships),
);
router.post('/', handlerWrapper(walletPost));

routerWrapper.use('/wallets', apiKeyHandler, verifyJWTHandler, router);
module.exports = routerWrapper;
