const express = require("express");
const authRouter = express.Router();
const helper = require("./utils");
const Wallet = require("../models/Wallet");
const WalletService = require("../services/WalletService");
const JWTService = require("../services/JWTService");
const Joi = require("joi");
const Session = require("../models/Session");

authRouter.post(
  "/",
  helper.apiKeyHandler,
  helper.handlerWrapper(async (req, res, next) => {
    Joi.assert(
      req.body,
      Joi.object({
        wallet: Joi.alternatives().try(
          Joi.string().min(4).max(36),
        ).required(),
        password: Joi.string()
          .max(32)
          .required(),
      })
    );
    const { wallet, password } = req.body;
    const session = new Session();
    const walletService = new WalletService(session);
    
    console.log(wallet)
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
