const express = require('express');
const Sentry = require('@sentry/node');
const bodyParser = require('body-parser');
const http = require('http');
const pg = require('pg');
const pool = require('./database/database.js');
const router = require('./routes/router.js')
const authController = require('./controllers/authController.js');

const path = require('path');
const asyncHandler = require('express-async-handler');
const { check, validationResult } = require('express-validator');
const { body } = require('express-validator');


const app = express();
const port = process.env.NODE_PORT || 3006;

const config = require('../config/config.js');

Sentry.init({ dsn: config.sentry_dsn });

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

app.use('/', router);

// Global error handler
app.use((err, req, res, next) => {
  const defaultErr = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    message: { err: 'An error occured' },
  };
  // replaces the errorObj with custom returned err from middleware
  const errorObj = { ...defaultErr, ...err };
  return res.status(errorObj.status).json(errorObj.message.err);
});


app.set('view engine','html');

app.get('/wallet/:wallet_id/event', asyncHandler(async (req, res, next) => {

}));

app.post('/wallet/:wallet_id/trust/request', asyncHandler(async (req, res, next) => {

  const type = req.body.type;
  //const requestor_wallet_id = req.body.wallet_id; this is in the bearer token
  const requested_wallet_id = req.params.wallet_id;


}));

app.post('/wallet/:wallet_id/trust/approve',  asyncHandler(async (req, res, next) => {

  const type = req.body.type;
  //const wallet_id = req.body.wallet_id; // in the bearer token
  const approved_wallet_id = req.params.wallet_id;

}));

app.get('*',function(req, res){
  console.log('Did not match path', req.originalUrl);
});

app.post('*',function(req, res){
  console.log('Did not match path', req.originalUrl);
});



app.listen(port,()=>{
    console.log('listening on port ' + port);
});

module.exports = app; 



// error from the API . We need to check and add error on those when you put wrong token to the postman
// error was with POST acccount
