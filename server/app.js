const express = require('express');
const Sentry = require('@sentry/node');
const HttpError = require('./utils/HttpError');
const routes = require('./routes');
const walletRouter = require('./routes/walletRouter');
const {
  errorHandler,
  apiKeyHandler,
  handlerWrapper,
} = require('./utils/utils');

const app = express();

const config = require('../config/config.js');

Sentry.init({ dsn: config.sentry_dsn });

/*
 * Check request
 */
app.use(
  handlerWrapper(async (req, _res, next) => {
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

app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(express.json()); // parse application/json

app.use(apiKeyHandler, routes);

// Global error handler
app.use(errorHandler);

const { version } = require('../package.json');

app.get('*', function (req, res) {
  res.status(200).send(version);
});

module.exports = app;
