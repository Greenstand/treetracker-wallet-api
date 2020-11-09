const express = require('express');
const helper = require('./utils');
const WalletService = require("../services/WalletService");
const TrustService = require("../services/TrustService");

const walletRouter = express.Router();

/* Get response

{
  "wallets": [
    {
      "type": "string",
      "wallet": "string",
      "email": "string",
      "phone": "string",
      "access": "string",
      "tokens_in_wallet": 0,
      "trust_relationships": [
        {
          "id": 0,
          "actor_wallet": "string",
          "target_wallet": "string",
          "trust_type": "string",
          "state": "string",
          "trust_request_type": "string",
          "orginating_wallet": "string",
          "created_at": "string"
        }
      ]
    }
  ]
}

*/


walletRouter.get('/', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const walletService = new WalletService();
    const trustService = new TrustService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const walletsJson = ['getCheck'];

    res.status(200).json({
      wallets: walletsJson
    });
  })
);

/* 
{
  "wallet": "sprinter_van_2004"
}
*/

walletRouter.post('/', 
  helper.apiKeyHandler,
  helper.verifyJWTHandler,
  helper.handlerWrapper(async (req, res, next) => {
    const walletService = new WalletService();
    const trustService = new TrustService();
    const wallet = await walletService.getById(res.locals.wallet_id);
    const json = ['postCheck'];

    res.status(200).json({
      wallet: json
    });
  })
)


module.exports = walletRouter;