const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const {
  handlerWrapper,
  verifyJWTHandler,
  apiKeyHandler,
} = require('../utils/utils');
const { eventsGet } = require('../handlers/eventHandler');

router.get('/', handlerWrapper(eventsGet));

routerWrapper.use('/events', apiKeyHandler, verifyJWTHandler, router);
module.exports = routerWrapper;
