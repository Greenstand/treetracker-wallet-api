const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const keycloak = require('../middleware/keycloak');

const { handlerWrapper, apiKeyHandler } = require('../utils/utils');
const { eventsGet } = require('../handlers/eventHandler');

router.get('/', keycloak.protect(), handlerWrapper(eventsGet));

routerWrapper.use('/events', apiKeyHandler, router);
module.exports = routerWrapper;
