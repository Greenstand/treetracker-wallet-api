const Broker = require('rascal').BrokerAsPromised;
const config = require("./MQConfig").config;
const HttpError = require("../utils/HttpError");

class MQService{

  constructor(session){
    this._settsion = session;
  }

  async sendMessage(payload){
    try {
        const broker = await Broker.create(config);
        const publication = await broker.publish("raw-capture-created", payload, "field-data.capture.creation");
        publication
          // eslint-disable-next-line
        .on("success", resultHandler)
        .on("error", (err, messageId)=> {
            console.error(`Error with id ${messageId} ${err.message}`);
            throw err;
        });
    } catch(err) {
      console.error(`Error publishing message ${err}`);
      throw new HttpError(500, `Error publishing message ${err}`);
    }
  }

  
}

module.exports = MQService;
