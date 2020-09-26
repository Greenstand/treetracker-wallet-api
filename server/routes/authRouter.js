const express = require('express');
const authRouter = express.Router();
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const WalletModel = require("../models/WalletModel");
const JWTModel = require("../models/auth/JWTModel");

authRouter.post('/',
  [
    check('wallet').isAlphanumeric(),
    check('password', 'Password is invalid').isLength({ min: 8, max: 32 }),
    check('wallet', 'Invalid wallet').isLength({ min: 4, max: 32 }),
  ],
  helper.apiKeyHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const { wallet, password } = req.body;
    const walletModel = new WalletModel();
    const walletObject = await walletModel.authorize(wallet, password);

    const jwtModel = new JWTModel();
    const jwt = jwtModel.sign(walletObject);
    res.locals.jwt = jwt;
    res.status(200).json({ token: res.locals.jwt });
    next();
  }));

module.exports = authRouter;
