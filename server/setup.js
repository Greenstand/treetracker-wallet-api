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
    
    var _url             = options && options.url || 'http://localhost:8000/main/log',
        _callOriginal    = options && options.callOriginal || false,
        _prefix          = options && options.prefix,
        _originalFactory = logger.methodFactory,
        _sendQueue       = [],
        _isSending       = false

    logger.methodFactory = function (methodName, logLevel, loggerName) {
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
    
    var _sendNextMessage = function(message){

/*        if (!_sendQueue.length || _isSending)
            console.log('skpping')
            return
        
        _isSending = true
        */
         
   /*
        var msg = _sendQueue.shift(),
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
}

if(process.env.REMOTE_LOG_URL){
  console.log("Using remote log endpoint: " + process.env.REMOTE_LOG_URL)
  loglevelServerSend(log,{url:process.env.REMOTE_LOG_URL})
}

