const express = require('express');
const cors = require('cors');
const HttpError = require('./utils/HttpError');
const routes = require('./routes');
const { errorHandler, handlerWrapper } = require('./utils/utils');

const app = express();

if (process.env.NODE_ENV === 'development') {
  app.use(cors());
}

/*
 * Check request
 */
app.use(
  // eslint-disable-next-line consistent-return
  handlerWrapper(async (req, res, next) => {
    if (
      (req.path === '/wallets/batch-create-wallet' ||
        req.path === '/wallets/batch-transfer') &&
      req.method === 'POST'
    ) {
      if (
        !req.headers['content-type'] ||
        !req.headers['content-type'].includes('multipart/form-data')
      ) {
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

app.use(express.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(express.json()); // parse application/json

app.use(routes);

// Global error handler
app.use(errorHandler);

const { version } = require('../package.json');

app.get('*', function (req, res) {
  res.status(200).send(version);
});

module.exports = app;
