const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const authController = require('../controllers/authController.js');


router.post('/auth',
  [
    check('wallet').isAlphanumeric(),
    check('password','Password is invalid').isLength({ min: 8, max: 32 }),
    check('wallet','Invalid wallet').isLength({ min: 4, max: 32 }),
  ],
  authController.apiKey,
  authController.authorize,
  authController.issueJWT,
  (req, res) => res.status(200).json({ token: res.locals.jwt }));


module.exports = router;
