const express = require('express');
const authRouter = express.Router();
const { check, validationResult } = require('express-validator');
const helper = require("./utils");
const Wallet = require("../models/Wallet");
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");
const expect = require("expect-runtime");
const Joi = require("joi");
const Session = require("../models/Session");

authRouter.post('/',
  helper.apiKeyHandler,
  helper.handlerWrapper(async (req, res, next) => {
    Joi.assert(
      req.body,
      Joi.object({
        wallet: Joi.string()
          .alphanum()
          .min(4)
          .max(32)
          .required(),
        password: Joi.string()
          .pattern(new RegExp('^[a-zA-Z0-9]+$'))
          .min(8)
          .max(32)
          .required(),
      })
    );
    const { wallet, password } = req.body;
    const session = new Session();
    const walletService = new WalletService(session);
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
