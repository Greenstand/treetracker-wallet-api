const express = require('express');
const helper = require('./utils');
const WalletService = require('../services/WalletService');
const TrustService = require('../services/TrustService');
const Joi = require('joi');
const multer = require('multer');
const Session = require('../models/Session');
const HttpError = require('../utils/HttpError');

const upload = multer({
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'text/csv') {
      return cb(new HttpError(422, 'Only csv files are supported'));
    }

    cb(undefined, true);
  },
  dest: 'tmp/csv/',
});

const walletRouter = express.Router();

walletRouter.get(
  '/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    console.warn('get wallet...');
    Joi.assert(
      req.query,
      Joi.object({
        limit: Joi.number().required(),
        start: Joi.number().min(1).max(10000).integer(),
        order_by: Joi.string().valid('created_at'),
        order: Joi.string().valid('asc', 'desc'),
        created_at_start_date: Joi.date().iso(),
        created_at_end_date: Joi.date().iso(),
      }),
    );
    const {
      limit,
      start,
      order_by = 'created_at',
      order = 'desc',
      created_at_start_date,
      created_at_end_date,
    } = req.query;
    const loggedInWalletId = res.locals.wallet_id;

    function convertStartToOffset(_start) {
      return _start ? _start - 1 : 0;
    }
    async function getWallets(walletId, _limit, _offset) {
      console.warn('getWallet with SQL', walletId, _limit, _offset);
      const knex = require('../database/knex');
      const SQL = `
        with wallet_ids as (
        (select '${walletId}' as sub_wallet_id) 
        union
        (
        select target_wallet_id as sub_wallet_id from 
        wallet_trust wt
        where 
          wt.actor_wallet_id = '${walletId}' and 
          wt.request_type = 'manage' and
          wt.state = 'trusted')
        union
        (
        select actor_wallet_id as sub_wallet_id from
        wallet_trust wt
        where
          wt.target_wallet_id = '${walletId}' and
          wt.request_type = 'yield' and
          wt.state = 'trusted'
        )
        )
        select w.id, name, logo_url, count(t.id) tokens_in_wallet
        from wallet w 
        left join token t
        on w.id = t.wallet_id
        where w.id in (select sub_wallet_id from wallet_ids)
        ${
          created_at_start_date
            ? `and w.created_at >= '${created_at_start_date}'::date`
            : ''
        }
        ${
          created_at_end_date
            ? `and w.created_at <= '${created_at_end_date}'::date`
            : ''
        }
        group by w.id, w.name, w.logo_url 
        order by w.${order_by} ${order}
        limit ${_limit} offset ${_offset};
      `;
      console.warn('SQL', SQL);
      const result = await knex.raw(SQL);
      console.warn('get result with rows:', result.rows.length);
      return result.rows;
    }
    const wallets = await getWallets(
      loggedInWalletId,
      limit,
      convertStartToOffset(start),
    );
    res.status(200).json({
      // tokens: tokensJson,
      wallets,
    });
    return;
  }),
);

// TO DO: Add below route to yaml

walletRouter.get(
  '/:wallet_id/trust_relationships',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const session = new Session();
    const trustService = new TrustService(session);
    const walletService = new WalletService(session);
    const wallet = await walletService.getById(req.params.wallet_id);
    const trust_relationships = await wallet.getTrustRelationships(
      req.query.state,
      req.query.type,
      req.query.request_type,
    );
    const trust_relationships_json = [];
    for (let t of trust_relationships) {
      const j = await trustService.convertToResponse(t);
      trust_relationships_json.push(j);
    }
    res.status(200).json({
      trust_relationships: trust_relationships_json,
    });
  }),
);

walletRouter.post(
  '/',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    Joi.assert(
      req.body,
      Joi.object({
        wallet: Joi.string().required(),
      }),
    );
    const session = new Session();
    const walletService = new WalletService(session);
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const addedWallet = await loggedInWallet.addManagedWallet(req.body.wallet);

    res.status(200).json({
      wallet: addedWallet.name,
    });
  }),
);

walletRouter.post(
  '/batch-create-wallet',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  upload.single('csv'),
  helper.handlerWrapper(async (req, res, next) => {
    const bodySchema = Joi.object({
      sender_wallet: Joi.string(),
      token_transfer_amount_default: Joi.number().integer(),
    }).with('token_transfer_amount_default', 'sender_wallet');

    const body = req.body;
    const file = req.file;

    await bodySchema.validateAsync(body, { abortEarly: false });

    const csvValidationSchema = Joi.array()
      .items(
        Joi.object({
          wallet_name: Joi.string().trim().required(),
          token_transfer_amount_overwrite: [
            Joi.number().integer(),
            Joi.string().valid(''),
          ],
          extra_wallet_data_about: Joi.string().allow(''),
          extra_wallet_data_logo_url: Joi.string().uri().allow(''),
          extra_wallet_data_cover_url: Joi.string().uri().allow(''),
        }),
      )
      .unique('wallet_name')
      .min(1)
      .max(2500);

    const session = new Session();
    const walletService = new WalletService(session);
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const result = await walletService.processBatchWallets({
      body,
      file,
      loggedInWallet,
      csvValidationSchema,
    });

    res.status(200).send(result);
  }),
);

walletRouter.post(
  '/batch-transfer',
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  upload.single('csv'),
  helper.handlerWrapper(async (req, res, next) => {
    const bodySchema = Joi.object({
      sender_wallet: Joi.string().required(),
      token_transfer_amount_default: Joi.number().integer(),
    }).with('token_transfer_amount_default', 'sender_wallet');

    const body = req.body;
    const file = req.file;

    await bodySchema.validateAsync(body, { abortEarly: false });

    const csvValidationSchema = Joi.array()
      .items(
        Joi.object({
          wallet_name: Joi.string().trim().required(),
          token_transfer_amount_overwrite: [
            Joi.number().integer(),
            Joi.string().valid(''),
          ],
        }),
      )
      .unique('wallet_name')
      .min(1)
      .max(2500);

    const session = new Session();
    const walletService = new WalletService(session);
    const loggedInWallet = await walletService.getById(res.locals.wallet_id);
    const result = await walletService.processBatchWalletTransfer({
      body,
      file,
      loggedInWallet,
      csvValidationSchema,
    });

    res.status(200).send(result);
  }),
);

module.exports = walletRouter;
