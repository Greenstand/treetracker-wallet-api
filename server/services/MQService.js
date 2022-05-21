const Broker = require('rascal').BrokerAsPromised;
const config = require("./MQConfig").config;
const HttpError = require("../utils/HttpError");
const log = require("loglevel");

class MQService{

  constructor(session){
    this._settsion = session;
  }

  sendMessage(payload){
    log.warn("to send message");
    return new Promise((resolve, reject) => {
      Broker.create(config)
        .then(broker => {
          broker.publish("token-assigned", payload)
          .then(publication => {
            log.warn("publication is on");
            publication
            .on("success", () => {
              log.warn("message sent!");
              resolve(true);
            })
            .on("error", (err, messageId)=> {
              const error = `Error with id ${messageId} ${err.message}`;
              log.error(error);
              reject(new HttpError(500, error));
            });
          })
          .catch(err => {
            log.error(err);
            reject(new HttpError(500, `Error publishing message ${err}`));
          })
        })
        .catch(err => {
          log.error(err);
          reject(new HttpError(500, `Error create broker ${err}`));
        })
    });
  }
}

module.exports = MQService;
