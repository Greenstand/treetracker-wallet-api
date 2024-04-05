const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const { authenticateToken } = require('../middleware/tokenAuthValidation');

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

router.post('/', handlerWrapper(transferPost));
router.post('/:transfer_id/accept', handlerWrapper(transferIdAcceptPost));
router.post('/:transfer_id/decline', handlerWrapper(transferIdDeclinePost));
router.delete('/:transfer_id', handlerWrapper(transferIdDelete));
router.post('/:transfer_id/fulfill', handlerWrapper(transferIdFulfill));
router.get('/', handlerWrapper(transferGet));
router.get('/:transfer_id', handlerWrapper(transferIdGet));
router.get('/:transfer_id/tokens', handlerWrapper(transferIdTokenGet));

routerWrapper.use('/transfers', apiKeyHandler, authenticateToken, router);
module.exports = routerWrapper;
