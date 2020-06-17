const express = require('express');
const router = express.Router();
// const bearerToken = require('express-bearer-token');
const { check, validationResult } = require('express-validator');
const authController = require('../controllers/authController.js');
const userController = require('../controllers/userController.js');

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

router.get('/tree',
  [
    check('limit', 'Invalid limit number').optional().isNumeric({ min: 1, max: 1000 }),
    check('wallet', 'Invalid wallet name').optional().isAlphanumeric(),
  ],
  authController.verifyJWT,
  (req, res, next) => {
    res.locals.role = 'list_trees';
    next();
  },
  authController.checkAccess,
  userController.getTrees,
  (req, res) => res.status(200).json(res.locals.trees));


module.exports = router;
