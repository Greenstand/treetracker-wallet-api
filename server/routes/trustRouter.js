const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const { verifyJWTHandler, handlerWrapper } = require('../utils/utils');

const {
  trustGet,
  trustRelationshipDelete,
  trustRelationshipDecline,
  trustRelationshipAccept,
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

routerWrapper.use('/trust_relationships', verifyJWTHandler, router);
module.exports = routerWrapper;
