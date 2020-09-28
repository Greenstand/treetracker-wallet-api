/*
 * Some utils for router/express
 */
const log = require("loglevel");
const HttpError = require("../utils/HttpError");
log.setLevel("debug");
const ApiKey = require("../models/auth/ApiKey");
const JWT = require("../models/auth/JWT.js");


/*
 * This is from the library https://github.com/Abazhenov/express-async-handler
 * Made some customization for our project. With this, we can throw Error from
 * the handler function or internal function call stack, and parse the error, 
 * send to the client with appropriate response (http error code & json body)
 *
 * USAGE: wrap the express handler with this function:
 *
 *  router.get("/xxx", handlerWrap(async (res, rep, next) => {
 *    ...
 *  }));
 *
 *  Then, add the errorHandler below to the express global error handler.
 *
 */
exports.handlerWrapper = fn =>
  function wrap(...args) {
    const fnReturn = fn(...args)
    const next = args[args.length-1]
    return Promise.resolve(fnReturn).catch(e => {
      console.error("get error:", e);
      next(e);
    })
  }

exports.errorHandler = (err, req, res, next) => {
  log.debug("catch error:", err);
  if(err instanceof HttpError){
    res.status(err.code).send(err.message);
  }else{
    res.status(500).send("Unknown error");
  }
};

exports.apiKeyHandler = exports.handlerWrapper(async (req, res, next) => {
  const apiKey = new ApiKey();
  await apiKey.check(req.headers['treetracker-api-key']);
  log.debug('Valid Access');
  next();
});

exports.verifyJWTHandler = exports.handlerWrapper(async (req, res, next) => {
  const jwt = new JWT();
  const decode = jwt.verify(req.headers.authorization);
  res.locals.wallet_id = decode.id;
  next();
});

