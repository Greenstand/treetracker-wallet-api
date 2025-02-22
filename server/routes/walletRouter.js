const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const multer = require('multer');
const HttpError = require('../utils/HttpError');

const upload = multer({
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'text/csv') {
      return cb(new HttpError(422, 'Only CSV files are supported.'));
    }
    return cb(undefined, true);
  },
  dest: './tmp/csv',
  limits: { fileSize: 500000 },
});

const imageUpload = multer({
  fileFilter(req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    return cb(new HttpError(422, 'Only image files are supported.'));
  },
  limits: { fileSize: 1000000 },
});

const {
  handlerWrapper,
  verifyJWTHandler,
} = require('../utils/utils');
const {
  walletGet,
  walletGetTrustRelationships,
  walletPost,
  walletSingleGet,
  walletBatchCreate,
  walletBatchTransfer,
  walletPatch,
} = require('../handlers/walletHandler');

router
  .route('/')
  .get(handlerWrapper(walletGet))
  .post(handlerWrapper(walletPost));

router.get('/:wallet_id', handlerWrapper(walletSingleGet));

router.patch(
  '/:wallet_id',
  imageUpload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'logo_image', maxCount: 1 },
  ]),
  handlerWrapper(walletPatch),
);

router.get(
  '/:wallet_id/trust_relationships',
  handlerWrapper(walletGetTrustRelationships),
);

router.post(
  '/batch-create-wallet',
  upload.single('csv'),
  handlerWrapper(walletBatchCreate),
);

router.post(
  '/batch-transfer',
  upload.single('csv'),
  handlerWrapper(walletBatchTransfer),
);

routerWrapper.use('/wallets', verifyJWTHandler, router);
module.exports = routerWrapper;
