const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const {
  tokenGet,
  tokenGetById,
  tokenGetTransactionsById,
} = require('../handlers/tokenHandler');
const {
  handlerWrapper,
  verifyJWTHandler,
} = require('../utils/utils');

router.get('/', handlerWrapper(tokenGet));
router.get('/:id', handlerWrapper(tokenGetById));
router.get('/:id/transactions', handlerWrapper(tokenGetTransactionsById));

routerWrapper.use('/tokens', verifyJWTHandler, router);
module.exports = routerWrapper;
