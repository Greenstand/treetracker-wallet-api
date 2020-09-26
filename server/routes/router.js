const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const assert = require("assert");
const TrustModel = require('../models/TrustModel');
const expect = require("expect-runtime");
const helper = require("./utils");
const WalletModel = require("../models/WalletModel");
const JWTModel = require("../models/auth/JWTModel");
const TokenModel = require("../models/TokenModel");


// Routes that require logged in status

// router.get('/tree',
//   [
//     check('limit', 'Invalid limit number').optional().isNumeric({ min: 1, max: 1000 }),
//     check('wallet', 'Invalid wallet name').optional().isAlphanumeric(),
//   ],
//   authController.verifyJWT,
//   authController.checkAccess('list_trees'),
//   userController.getTrees,
//   (req, res) => res.status(200).json(res.locals.trees));

router.get('/token/:uuid',
  [
    //TODO ? check('limit', 'Invalid limit number').optional().isNumeric({ min: 1, max: 1000 }),
    //TODO ? check('wallet', 'Invalid wallet name').optional().isAlphanumeric(),
  ],
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
//TODO ? didn't defined access role for GET /token
//  (req, res, next) => {
//    res.locals.role = 'list_trees';
//    next();
//  },
//  authController.checkAccess,
  helper.handlerWrapper(async (req, res, next) => {
    const {uuid} = req.params;
    const tokenModel = new TokenModel();
    const tokens = await tokenModel.getByUUID(uuid);
    res.status(200).json({tokens});
  })
)

// router.get('/account',
//   authController.verifyJWT,
//   authController.checkAccess('accounts'),
//   userController.getAccounts,
//   (req, res) => res.status(200).json(res.locals.accounts));

// router.post('/account',
//   [
//     check('wallet', 'Invalid wallet name').isAlphanumeric()
//   ],
//   authController.verifyJWT,
//   authController.checkAccess('manage_accounts'),
//   userController.addAccount,
//   (_, res) => {
//     assert(res.locals);
//     assert(res.locals.response);
//     res.status(200).json(res.locals.response);
//   });

// router.post('/transfer',
//   [
//     check('tokens[*].*').isUUID(),
//     check('sender_wallet', 'Invalid Sender wallet name').isAlphanumeric(),
//     check('receiver_wallet', 'Invalid Reciever wallet name').isAlphanumeric()
//   ],
//   authController.verifyJWT,
//   authController.checkAccess('manage_accounts'),
//   userController.transfer,
//   (_, res) => {
//     assert(res.locals);
//     assert(res.locals.response);
//     res.status(200).json(res.locals.response);
//   });

// router.post('/send',
// [
//   check('tokens[*].*').isUUID(),
//   check('receiver_wallet', 'Invalid Receiver wallet name').isAlphanumeric(),
// ],
//   authController.verifyJWT,
//   authController.checkAccess('manage_accounts'),
//   userController.send,
//   (_, res) => {
//     assert(res.locals);
//     assert(res.locals.response);
//     res.status(200).json(res.locals.response);
//   });

// router.post('/transfer/bundle',
//   [
//     check('bundle_size').isNumeric(),
//     check('sender_wallet', 'Invalid Sender wallet name').isAlphanumeric(),
//     check('receiver_wallet', 'Invalid Reciever wallet name').isAlphanumeric()
//   ],
//   authController.verifyJWT,
//   authController.checkAccess('manage_accounts'),
//   userController.transferBundle,
//   (_, res) => {
//     assert(res.locals);
//     assert(res.locals.response);
//     res.status(200).json(res.locals.response);
//   });

// router.get('/history',
//   [
//     check('token').isUUID()
//   ],
//   authController.verifyJWT,
//   authController.checkAccess('manage_accounts'),
//   userController.history,
//   (_, res) => {
//     assert(res.locals);
//     assert(res.locals.response);
//     res.status(200).json(res.locals.response);
//   });



module.exports = router;
