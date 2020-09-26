const express = require('express');
const Sentry = require('@sentry/node');
const bodyParser = require('body-parser');
const router = require('./routes/router.js')
const asyncHandler = require('express-async-handler');
const { check, validationResult } = require('express-validator');
const { body } = require('express-validator');
const HttpError = require("./utils/HttpError");
const authRouter = require('./routes/authRouter.js')
const trustRouter = require('./routes/trustRouter.js')


const app = express();

const config = require('../config/config.js');

Sentry.init({ dsn: config.sentry_dsn });

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

//routers
app.use('/auth', authRouter);
app.use('/trust_relationships', trustRouter);

app.use('/', router);


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
app.use((err, req, res, next) => {
  console.warn("cathed the error:", err);
  if(err instanceof HttpError){
    res.status(err.code).send(err.message);
  }else{
    res.status(500).send("Unknown error");
  }
});



//do not run the express app by default
//app.listen(port,()=>{
//    console.log('listening on port ' + port);
//});

module.exports = app; 
