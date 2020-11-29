/*
 * A file to setup some global setting, like log level
 */
const log = require("loglevel");
if(process.env.NODE_LOG_LEVEL){
  log.setDefaultLevel(process.env.NODE_LOG_LEVEL);
}else{
  log.setDefaultLevel("info");
}

const defaults = {
  url: 'http://104.131.78.177:8000/treetracker-wallet-api/log'
  method: 'POST',
  headers: {},
  token: '',
  onUnauthorized: failedToken => {},
  timeout: 0,
  interval: 1000,
  level: 'debug',
  backoff: {
    multiplier: 2,
    jitter: 0.1,
    limit: 30000,
  },
  capacity: 500,
  stacktrace: {
    levels: ['warn', 'error'],
    depth: 3,
    excess: 0,
  },
  timestamp: () => new Date().toISOString(),
  format: remote.plain,
};
apply(loglevel, options)
