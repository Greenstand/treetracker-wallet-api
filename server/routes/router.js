const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const authController = require('../controllers/authController.js');
const userController = require('../controllers/userController.js');
const assert = require("assert");
const TrustService = require('../services/TrustService');
const expect = require("expect-runtime");

const asyncUtil = fn =>
function asyncUtilWrap(...args) {
  const fnReturn = fn(...args)
  const next = args[args.length-1]
  return Promise.resolve(fnReturn).catch(e => {
    console.error("get error:", e);
    next(e);
  })
}

router.post('/auth',
  [
    check('wallet').isAlphanumeric(),
    check('password', 'Password is invalid').isLength({ min: 8, max: 32 }),
    check('wallet', 'Invalid wallet').isLength({ min: 4, max: 32 }),
  ],
  authController.apiKey,
  authController.authorize,
  authController.issueJWT,
  (req, res) => res.status(200).json({ token: res.locals.jwt }));

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
  authController.verifyJWT,
//TODO ? didn't defined access role for GET /token
//  (req, res, next) => {
//    res.locals.role = 'list_trees';
//    next();
//  },
//  authController.checkAccess,
  userController.token,
  (req, res) => res.status(200).json(res.locals.response));

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

router.get('/trust_relationships',
//  [
//    check('token').isUUID()
//  ],
  authController.verifyJWT,
  asyncUtil(async (req, res, next) => {
    const trustService = new TrustService();
    res.locals.response = {
      trust_relationships: await trustService.getTrustModel().get(),
    }
    next();
  }),
  (_, res) => {
    assert(res.locals);
    assert(res.locals.response);
    res.status(200).json(res.locals.response);
  },
);

router.post('/trust_relationships',
//  [
//    check('token').isUUID()
//  ],
  authController.verifyJWT,
  asyncUtil(async (req, res, next) => {
    const trustService = new TrustService();
    expect(req).property("body").property("trust_request_type").a(expect.any(String));
    expect(req).property("body").property("wallet").a(expect.any(String));
    const trust_relationships = await trustService.request(
      req.body.trust_request_type,
      req.body.wallet,
    );
    res.locals.response = {
      trust_relationships,
    };
    next();
  }),
  (_, res) => {
//    assert(res.locals);
//    assert(res.locals.response);
//    res.status(200).json(res.locals.response);
    res.status(200).json({todo:'todo'});
  },
);


module.exports = router;
