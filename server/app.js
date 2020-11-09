const express = require('express');
const Sentry = require('@sentry/node');
const bodyParser = require('body-parser');
const asyncHandler = require('express-async-handler');
const { check, validationResult } = require('express-validator');
const { body } = require('express-validator');
const HttpError = require("./utils/HttpError");
const authRouter = require('./routes/authRouter.js')
const trustRouter = require('./routes/trustRouter.js')
const tokenRouter = require('./routes/tokenRouter.js')
const transferRouter = require("./routes/transferRouter");
const walletRouter = require("./routes/walletRouter");
const {errorHandler} = require("./routes/utils");


const app = express();

const config = require('../config/config.js');

Sentry.init({ dsn: config.sentry_dsn });

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

//routers
app.use('/auth', authRouter);
app.use('/tokens', tokenRouter);
app.use('/trust_relationships', trustRouter);
app.use('/transfers', transferRouter);
app.use('/wallet', walletRouter);



app.set('view engine','html');

app.get('/wallet/:wallet_id/event', asyncHandler(async (req, res, next) => {

}));

app.post('/wallet/:wallet_id/trust/request', asyncHandler(async (req, res, next) => {

  const type = req.body.type;
  //const requestor_wallet_id = req.body.wallet_id; this is in the bearer token
  const requested_wallet_id = req.params.wallet_id;


}));

app.post('/wallet/:wallet_id/trust/approve', asyncHandler(async (req, res, next) => {

  const type = req.body.type;
  //const wallet_id = req.body.wallet_id; // in the bearer token
  const approved_wallet_id = req.params.wallet_id;

}));

// Global error handler
app.use(errorHandler);


//do not run the express app by default
//app.listen(port,()=>{
//    console.log('listening on port ' + port);
//});

module.exports = app; 
