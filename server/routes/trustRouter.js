const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const keycloak = require('../middleware/keycloak');

const { handlerWrapper, apiKeyHandler } = require('../utils/utils');

const {
  trustGet,
  trustRelationshipDelete,
  trustRelationshipDecline,
  trustRelationshipAccept,
  trustRelationshipGetById,
  trustPost,
} = require('../handlers/trustHandler');

router.get('/', keycloak.protect(), handlerWrapper(trustGet));
router.post('/', keycloak.protect(), handlerWrapper(trustPost));
router.post(
  '/:trustRelationshipId/accept',
  keycloak.protect(),
  handlerWrapper(trustRelationshipAccept),
);
router.post(
  '/:trustRelationshipId/decline',
  keycloak.protect(),
  handlerWrapper(trustRelationshipDecline),
);
router.delete(
  '/:trustRelationshipId',
  keycloak.protect(),
  handlerWrapper(trustRelationshipDelete),
);
router.get(
  '/:trustRelationshipId',
  keycloak.protect(),
  handlerWrapper(trustRelationshipGetById),
);

routerWrapper.use('/trust_relationships', apiKeyHandler, router);
module.exports = routerWrapper;
