const MQService = require("./MQService");
const Broker = require('rascal').BrokerAsPromised;
const sinon = require("sinon");

describe("MQService", () => {
  
  afterEach(() => {
    sinon.restore();
  });

  it.only("send message", async () => {
    sinon.stub(Broker, "create").returns({
      publish: () => console.log("publish"),
    });
    // eslint-disable-next-line
    mqService = new MQService();

    // eslint-disable-next-line
    await mqService.sendMessage({a:1});

  });

});
