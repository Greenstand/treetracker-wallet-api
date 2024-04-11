const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const {
  handlerWrapper,
  verifyJWTHandler,
  apiKeyHandler,
} = require('../utils/utils');

const {
  generate,
  transfer,
} = require('../handlers/actiontokenHandler');

router.get('/generate', handlerWrapper(generate));
router.post('/transfer', handlerWrapper(transfer));


routerWrapper.use('/actiontoken', apiKeyHandler, verifyJWTHandler, router);
module.exports = routerWrapper;
