const MQService = require("./MQService");
const Broker = require('rascal').BrokerAsPromised;
const sinon = require("sinon");
const {expect} = require("chai");
const jestExpect = require("expect");
const log = require("loglevel");

describe("MQService", () => {
  
  afterEach(() => {
    sinon.restore();
  });

  it("send message successfully", async () => {
    const broker = {
      publish: async () => {
        console.log("publish");
        return {
          on(event, handler){
            // mock the success event
            if(event === "success"){
              setImmediate(handler);
            }
            return this;
          }
        }
      }
    };
    sinon.spy(broker, "publish");
    sinon.stub(Broker, "create").resolves(broker);
    const mqService = new MQService();

    const payload = {a:1};
    const result = await mqService.sendMessage(payload);
    expect(result).eq(true);
    sinon.assert.calledWith(broker.publish, "raw-capture-created", payload, "field-data.capture.creation");

  });

  it("send message with problem", async () => {
    sinon.stub(Broker, "create").resolves({
      publish: async () => {
        console.log("publish");
        return {
          on(event, handler){
            // mock the error event
            if(event === "error"){
              setImmediate(() => handler(new Error("Message sending wrong"), "No.1"));
            }
            return this;
          }
        }
      }
    });
    const mqService = new MQService();

    await jestExpect(async () => {
      await mqService.sendMessage({a:1});
    }).rejects.toThrow(/Message sending wrong/);

  });

});

describe("Real operation, just for dev", () => {

  it("Send and receive message", async function(){
    try{
      
      const mqService = new MQService();
      const payload = {a:1};
      const result = await mqService.sendMessage(payload);
      log.warn("result:", result);
      

//      await new Promise((resolve, reject) => {
//        // check the message
//        // Consume a message
//        const config = require("./MQConfig").config;
//        Broker.create(config)
//          .then(broker => {
//            log.info("connected to broker");
//            broker.subscribeAll()
//              .then(subscriptions => {
//                subscriptions.forEach( subscription => {
//                  subscription.on('message', (message, content, ackOrNack) => {
//                    log.warn("message:", message, content);
//                    log.warn("message content received:", message.content && message.content.toString());
//                    ackOrNack();
//                    resolve();
//                  }).on('error', console.error);
//                });
//              });
//          });
//        const mqService = new MQService();
//        const payload = {a:1};
//        mqService.sendMessage(payload);
//      });
    }catch(e){
      log.error("e:",e );
    };
  });
});
