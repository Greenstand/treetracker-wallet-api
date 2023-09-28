const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const multer = require('multer');
const HttpError = require('../utils/HttpError');

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

const {
  handlerWrapper,
  verifyJWTHandler,
  apiKeyHandler,
} = require('../utils/utils');
const {
  walletGet,
  walletGetTrustRelationships,
  walletPost,
  walletSingleGet,
  walletBatchCreate,
} = require('../handlers/walletHandler');

router.get('/', handlerWrapper(walletGet));
router.get('/:wallet_id', handlerWrapper(walletSingleGet));

router.get(
  '/:wallet_id/trust_relationships',
  handlerWrapper(walletGetTrustRelationships),
);

router.post('/', handlerWrapper(walletPost));

router.post(
  '/batch-create-wallet',
  upload.single('csv'),
  handlerWrapper(walletBatchCreate),
);

routerWrapper.use('/wallets', apiKeyHandler, verifyJWTHandler, router);
module.exports = routerWrapper;
