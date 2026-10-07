const express = require('express');

const router = express.Router();
const routerWrapper = express.Router();

const { handlerWrapper, verifyRoleHandler } = require('../utils/utils');
const {
  walletGetAdmin,
  walletSingleGetAdmin,
  walletKeycloakAccountPost,
} = require('../handlers/walletHandler');

const WALLET_ADMIN_ROLE = 'wallet-admin';

router.get('/wallets', handlerWrapper(walletGetAdmin));
router.get('/wallets/:wallet_id', handlerWrapper(walletSingleGetAdmin));
router.post(
  '/wallets/:wallet_id/keycloak-account',
  handlerWrapper(walletKeycloakAccountPost),
);

// Mounted apart from /wallets because these endpoints answer about every
// wallet, so they gate on a keycloak role rather than on owning a wallet.
routerWrapper.use('/admin', verifyRoleHandler(WALLET_ADMIN_ROLE), router);
module.exports = routerWrapper;
