const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const {
  handlerWrapper,
  verifyJWTHandler,
  apiKeyHandler,
} = require('../utils/utils');
const {
  actionTokenGenerate,
  actionTokenRedeem,
} = require('../handlers/actionTokenHandler');

router.post('/', handlerWrapper(actionTokenGenerate));
router.post('/redeem', handlerWrapper(actionTokenRedeem));

routerWrapper.use('/action-tokens', apiKeyHandler, verifyJWTHandler, router);
module.exports = routerWrapper;
