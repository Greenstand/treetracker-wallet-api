const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const keycloak = require('../middleware/keycloak');

const { handlerWrapper, apiKeyHandler } = require('../utils/utils');
const {
  transferGet,
  transferIdAcceptPost,
  transferIdDeclinePost,
  transferIdDelete,
  transferIdFulfill,
  transferIdGet,
  transferIdTokenGet,
  transferPost,
} = require('../handlers/transferHandler');

router.post('/', keycloak.protect(), handlerWrapper(transferPost));
router.post(
  '/:transfer_id/accept',
  keycloak.protect(),
  handlerWrapper(transferIdAcceptPost),
);
router.post(
  '/:transfer_id/decline',
  keycloak.protect(),
  handlerWrapper(transferIdDeclinePost),
);
router.delete(
  '/:transfer_id',
  keycloak.protect(),
  handlerWrapper(transferIdDelete),
);
router.post(
  '/:transfer_id/fulfill',
  keycloak.protect(),
  handlerWrapper(transferIdFulfill),
);
router.get('/', keycloak.protect(), handlerWrapper(transferGet));
router.get('/:transfer_id', keycloak.protect(), handlerWrapper(transferIdGet));
router.get(
  '/:transfer_id/tokens',
  keycloak.protect(),
  handlerWrapper(transferIdTokenGet),
);

routerWrapper.use('/transfers', apiKeyHandler, router);
module.exports = routerWrapper;
