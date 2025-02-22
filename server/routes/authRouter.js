const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();
const { handlerWrapper } = require('../utils/utils');
const { authPost } = require('../handlers/authHandler');

router.post('/', handlerWrapper(authPost));
routerWrapper.use('/auth', router);

module.exports = routerWrapper;
