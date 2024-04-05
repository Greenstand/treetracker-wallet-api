const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const { authenticateToken } = require('../middleware/tokenAuthValidation');

const { handlerWrapper, apiKeyHandler } = require('../utils/utils');
const { eventsGet } = require('../handlers/eventHandler');

router.get('/', handlerWrapper(eventsGet));

routerWrapper.use('/events', apiKeyHandler, authenticateToken, router);
module.exports = routerWrapper;
