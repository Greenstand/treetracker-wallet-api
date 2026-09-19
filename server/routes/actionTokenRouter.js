const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const { handlerWrapper, verifyJWTHandler } = require('../utils/utils');
const {
  actionTokenGenerate,
  actionTokenRedeem,
  actionTokenList,
  actionTokenCancel,
} = require('../handlers/actionTokenHandler');

router.post('/', handlerWrapper(actionTokenGenerate));
router.post('/redeem', handlerWrapper(actionTokenRedeem));
router.get('/', handlerWrapper(actionTokenList));
router.delete('/:id', handlerWrapper(actionTokenCancel));

routerWrapper.use('/action-tokens', verifyJWTHandler, router);
module.exports = routerWrapper;
