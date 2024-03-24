const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const keycloak = require('../middleware/keycloak');

const {
  tokenGet,
  tokenGetById,
  tokenGetTransactionsById,
} = require('../handlers/tokenHandler');
const { handlerWrapper, apiKeyHandler } = require('../utils/utils');

router.get('/', keycloak.protect(), handlerWrapper(tokenGet));
router.get('/:id', keycloak.protect(), handlerWrapper(tokenGetById));
router.get(
  '/:id/transactions',
  keycloak.protect(),
  handlerWrapper(tokenGetTransactionsById),
);

routerWrapper.use('/tokens', apiKeyHandler, router);
module.exports = routerWrapper;
