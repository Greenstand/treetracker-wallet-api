const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const {
  verifyJWTHandler,
  handlerWrapper,
  apiKeyHandler,
} = require('../utils/utils');

const {
  trustGet,
  trustRelationshipDelete,
  trustRelationshipDecline,
  trustRelationshipAccept,
  trustRelationshipGetById,
  trustPost,
} = require('../handlers/trustHandler');

router.get('/', handlerWrapper(trustGet));
router.post('/', handlerWrapper(trustPost));
router.post(
  '/:trustRelationshipId/accept',
  handlerWrapper(trustRelationshipAccept),
);
router.post(
  '/:trustRelationshipId/decline',
  handlerWrapper(trustRelationshipDecline),
);
router.delete('/:trustRelationshipId', handlerWrapper(trustRelationshipDelete));
router.get('/:trustRelationshipId', handlerWrapper(trustRelationshipGetById))

routerWrapper.use(
  '/trust_relationships',
  apiKeyHandler,
  verifyJWTHandler,
  router,
);
module.exports = routerWrapper;
