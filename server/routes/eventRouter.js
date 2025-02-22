const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const {
  handlerWrapper,
  verifyJWTHandler,
} = require('../utils/utils');
const { eventsGet } = require('../handlers/eventHandler');

router.get('/', handlerWrapper(eventsGet));

routerWrapper.use('/events', verifyJWTHandler, router);
module.exports = routerWrapper;
