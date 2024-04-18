const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const { authenticateToken } = require('../middleware/tokenAuthValidation');

const {
  tokenGet,
  tokenGetById,
  tokenGetTransactionsById,
} = require('../handlers/tokenHandler');
const { handlerWrapper, apiKeyHandler } = require('../utils/utils');

router.get('/', handlerWrapper(tokenGet));
router.get('/:id', handlerWrapper(tokenGetById));
router.get('/:id/transactions', handlerWrapper(tokenGetTransactionsById));

routerWrapper.use('/tokens', apiKeyHandler, authenticateToken, router);
module.exports = routerWrapper;
