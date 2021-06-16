const Broker = require('rascal').BrokerAsPromised;
const config = require("./MQConfig").config;
const HttpError = require("../utils/HttpError");
const log = require("loglevel");

class MQService{

  constructor(session){
    this._settsion = session;
  }

  sendMessage(payload){
    return new Promise((resolve, reject) => {
      const broker = Broker.create(config);
      // TODO
      Promise.resolve(broker)
        .then(broker => {
          broker.publish("raw-capture-created", payload, "field-data.capture.creation")
          .then(publication => {
            publication
            .on("success", () => resolve(true))
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
        });
    });
  }
}

module.exports = MQService;
