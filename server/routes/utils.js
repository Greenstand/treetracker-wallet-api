/*
 * Some utils for router/express
 */
const log = require("loglevel");
const HttpError = require("../utils/HttpError");
log.setLevel("debug");


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

exports.apiKeyHandler = async (req, res, next) => {
  if (!req.headers['treetracker-api-key']) {
    console.log('ERROR: Invalid access - no API key');
    next({
      log: 'Invalid access - no API key',
      status: 401,
      message: { err: 'Invalid access - no API key' },
    });
  }
  const apiKey = req.headers['treetracker-api-key'];
  const query = {
    text: `SELECT *
    FROM api_key
    WHERE key = $1
    AND tree_token_api_access`,
    values: [apiKey],
  };
  const rval = await pool.query(query);

  if (rval.rows.length === 0) {
    console.log('ERROR: Authentication, Invalid access');
    next({
      log: 'Invalid API access',
      status: 401,
      message: { err: 'Invalid API access' },
    });
  }
  // console.log('Valid Access');
  next();
};
