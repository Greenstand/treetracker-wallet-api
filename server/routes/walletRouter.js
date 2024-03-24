const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const multer = require('multer');
const HttpError = require('../utils/HttpError');

const keycloak = require('../middleware/keycloak');

const upload = multer({
  // eslint-disable-next-line consistent-return
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'text/csv') {
      return cb(new HttpError(422, 'Only CSV files are supported.'));
    }
    cb(undefined, true);
  },
  dest: '/tmp/csv',
});

const { handlerWrapper, apiKeyHandler } = require('../utils/utils');
const {
  walletGet,
  walletGetTrustRelationships,
  walletPost,
  walletSingleGet,
  walletBatchCreate,
  walletBatchTransfer,
} = require('../handlers/walletHandler');

router.get('/', keycloak.protect(), handlerWrapper(walletGet));

router.get('/:wallet_id', keycloak.protect(), handlerWrapper(walletSingleGet));

router.get(
  '/:wallet_id/trust_relationships',
  keycloak.protect(),
  handlerWrapper(walletGetTrustRelationships),
);

router.post('/', keycloak.protect(), handlerWrapper(walletPost));

router.post(
  '/batch-create-wallet',
  upload.single('csv'),
  keycloak.protect(),
  handlerWrapper(walletBatchCreate),
);

router.post(
  '/batch-transfer',
  upload.single('csv'),
  keycloak.protect(),
  handlerWrapper(walletBatchTransfer),
);

routerWrapper.use('/wallets', apiKeyHandler, router);

module.exports = routerWrapper;
