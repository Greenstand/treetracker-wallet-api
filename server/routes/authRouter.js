const express = require('express');
const authRouter = express.Router();
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const Wallet = require("../models/Wallet");
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");
const expect = require("expect-runtime");

authRouter.post('/',
  [
    check('wallet').isAlphanumeric(),
    check('password', 'Password is invalid').isLength({ min: 8, max: 32 }),
    check('wallet', 'Invalid wallet').isLength({ min: 4, max: 32 }),
  ],
  helper.apiKeyHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const { wallet, password } = req.body;
    const walletService = new WalletService();
    const walletModel = await walletService.getByName(wallet);
    const walletObject = await walletModel.authorize(password);

    const jwtService = new JWTService();
    const token = jwtService.sign(walletObject);
    res.locals.jwt = token;
    res.locals.id = walletObject.id;
    res.status(200).json({ token: res.locals.jwt });
    next();
  }));

module.exports = authRouter;
