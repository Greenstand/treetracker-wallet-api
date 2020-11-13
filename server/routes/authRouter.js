const express = require("express");
const authRouter = express.Router();
const helper = require("./utils");
const Wallet = require("../models/Wallet");
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");
const Joi = require("joi");

authRouter.post(
  "/",
  helper.apiKeyHandler,
  helper.handlerWrapper(async (req, res, next) => {
    Joi.assert(
      req.body,
      Joi.object({
        wallet: Joi.alternatives().try(
          Joi.string().alphanum().min(4).max(32),
          Joi.number().min(4).max(32)
        ).required(),
        password: Joi.string()
          .pattern(new RegExp("^[a-zA-Z0-9]+$"))
          .min(8)
          .max(32)
          .required(),
      })
    );
    const { wallet, password } = req.body;
    const walletService = new WalletService();
    
    let walletObject = await walletService.getByIdOrName(wallet);
    walletObject = await walletObject.authorize(password);

    const jwtService = new JWTService();
    const token = jwtService.sign(walletObject);
    res.locals.jwt = token;
    res.locals.id = walletObject.id;
    res.status(200).json({ token: res.locals.jwt });
    next();
  })
);

module.exports = authRouter;
