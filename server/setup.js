/*
 * A file to setup some global setting, like log level
 */
const log = require("loglevel");
if(process.env.NODE_LOG_LEVEL){
  log.setDefaultLevel(process.env.NODE_LOG_LEVEL);
}else{
  log.setDefaultLevel("info");
}

const http = require('http')


var loglevelServerSend = function(logger,options) {
    if (!logger || !logger.methodFactory)
        throw new Error('loglevel instance has to be specified in order to be extended')
    
    console.log('setting up server send');
    var _url             = options && options.url || 'http://localhost:8000/main/log',
        _callOriginal    = options && options.callOriginal || false,
        _prefix          = options && options.prefix,
        _originalFactory = logger.methodFactory,
        _sendQueue       = [],
        _isSending       = false

    console.log(_url)
    
    logger.methodFactory = function (methodName, logLevel, loggerName) {
        console.log('method factory  called ' + methodName);
        var rawMethod = _originalFactory(methodName, logLevel)
    
        return function (message) {
            if (typeof _prefix === 'string')
                message = _prefix + message
            else if (typeof _prefix === 'function')
                message = _prefix(methodName,message)
            else
                message = methodName + ': ' + message
                        
            if (_callOriginal) 
                rawMethod(message)
            
           // _sendQueue.push(message)
            _sendNextMessage(message)
        }
    }
    logger.setLevel(logger.levels.DEBUG)
    console.log('hello setting up')
    
    var _sendNextMessage = function(message){

        console.log('send next message called');
/*        if (!_sendQueue.length || _isSending)
            console.log('skpping')
            return
        
        _isSending = true
        */
         
      /*
        var msg = _sendQueue.shift(),
            req = new XMLHttpRequest()
        
        req.open("POST", _url, true)
        console.log('posting to' + _url)
        req.setRequestHeader('Content-Type', 'text/plain')
        req.onreadystatechange = function() {
            if(req.readyState == 4) 
            {
                _isSending = false
                setTimeout(_sendNextMessage, 0)
            }
        }
        req.send(msg)
        */

        const options = {
          hostname: '104.131.78.177',
          port: 8000,
          path: '/treetracker-wallet-api/log',
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          }
        }

        const req = http.request(options, res => {
          res.on('data', d => {
            process.stdout.write(d)
          })
        })

      req.write(message)


        req.on('error', error => {
          console.error(error)
        })

      req.end()
    }
    console.log('hello')
}

loglevelServerSend(log,{url:'http://104.131.78.177:8000/treetracker-wallet-api/log'})
console.log('ok')
log.debug("debug log level!");
//  ,prefix: function(logSev,message) {
//   return '[' + new Date().toISOString() + '] ' + logSev + ': ' + message + '\n'
//}})


//const remote = require('loglevel-plugin-remote');

/*
const defaults = {
  url: 'http://104.131.78.177:8000/treetracker-wallet-api/log',
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
remote.apply(loglevel, options)
*/
