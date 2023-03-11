const express = require('express');
const Sentry = require('@sentry/node');
const bodyParser = require('body-parser');
const asyncHandler = require('express-async-handler');
const { check, validationResult } = require('express-validator');
const { body } = require('express-validator');
const HttpError = require('./utils/HttpError');
const authRouter = require('./routes/authRouter.js');
const trustRouter = require('./routes/trustRouter.js');
const tokenRouter = require('./routes/tokenRouter.js');
const transferRouter = require('./routes/transferRouter');
const walletRouter = require('./routes/walletRouter');
const { errorHandler } = require('./routes/utils');
const log = require('loglevel');
const helper = require('./routes/utils');

const app = express();

const config = require('../config/config.js');

Sentry.init({ dsn: config.sentry_dsn });

/*
 * Check request
 */
app.use(
  helper.handlerWrapper(async (req, _res, next) => {
    if (req.path === '/wallets/batch-create-wallet' && req.method === 'POST') {
      if (!req.headers['content-type']?.includes('multipart/form-data')) {
        throw new HttpError(
          415,
          'Invalid content type. Endpoint only supports multipart/form-data',
        );
      }
      return next();
    }
    if (
      req.method === 'POST' ||
      req.method === 'PATCH' ||
      req.method === 'PUT'
    ) {
      if (req.headers['content-type'] !== 'application/json') {
        throw new HttpError(
          415,
          'Invalid content type. API only supports application/json',
        );
      }
    }
    next();
  }),
);

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

//routers
app.use('/auth', authRouter);
app.use('/tokens', tokenRouter);
app.use('/trust_relationships', trustRouter);
app.use('/transfers', transferRouter);
app.use('/wallets', walletRouter);

app.set('view engine', 'html');

app.get(
  '/wallet/:wallet_id/event',
  asyncHandler(async (req, res, next) => {}),
);

app.post(
  '/wallet/:wallet_id/trust/request',
  asyncHandler(async (req, res, next) => {
    const type = req.body.type;
    //const requestor_wallet_id = req.body.wallet_id; this is in the bearer token
    const requested_wallet_id = req.params.wallet_id;
  }),
);

app.post(
  '/wallet/:wallet_id/trust/approve',
  asyncHandler(async (req, res, next) => {
    const type = req.body.type;
    //const wallet_id = req.body.wallet_id; // in the bearer token
    const approved_wallet_id = req.params.wallet_id;
  }),
);

// Global error handler
app.use(errorHandler);

const version = require('../package.json').version;
app.get('*', function (req, res) {
  res.status(200).send(version);
});

module.exports = app;
