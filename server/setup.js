/*
 * A file to setup some global setting, like log level
 */
const log = require('loglevel');

if (process.env.NODE_LOG_LEVEL) {
  log.setDefaultLevel(process.env.NODE_LOG_LEVEL);
} else {
  log.setDefaultLevel('info');
}

const http = require('http');

const _sendNextMessage = message => {
  const options = {
    hostname: '104.131.78.177',
    port: 8000,
    path: '/treetracker-wallet-api/log',
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
  };

  const req = http.request(options, (res) => {
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });

  req.write(message);

  req.on('error', (error) => {
    log.error(error);
  });

  req.end();
};
const loglevelServerSend = (loggerParam, options) => {
  const logger = { ...loggerParam };
  if (!logger || !logger.methodFactory)
    throw new Error(
      'loglevel instance has to be specified in order to be extended',
    );

  const _url = (options && options.url) || 'http://localhost:8000/main/log';
  const _callOriginal = (options && options.callOriginal) || false;
  const _prefix = options && options.prefix;
  const _originalFactory = logger.methodFactory;
  const _sendQueue = [];
  const _isSending = false;

  logger.methodFactory = (methodName, logLevel, _loggerName) => {
    const rawMethod = _originalFactory(methodName, logLevel);

    return messageParam => {
      let message = messageParam;
      if (typeof _prefix === 'string') message = _prefix + message;
      else if (typeof _prefix === 'function')
        message = _prefix(methodName, message);
      else message = `${methodName}: ${message}`;

      if (_callOriginal) rawMethod(message);

      _sendNextMessage(message);
    };
  };
  logger.setLevel(logger.levels.DEBUG);
};

if (process.env.REMOTE_LOG_URL) {
  log.info(`Using remote log endpoint: ${process.env.REMOTE_LOG_URL}`);
  loglevelServerSend(log, { url: process.env.REMOTE_LOG_URL });
}
