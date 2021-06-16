const MQService = require("./MQService");
const Broker = require('rascal').BrokerAsPromised;
const sinon = require("sinon");
const {expect} = require("chai");
const jestExpect = require("expect");

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
    sinon.stub(Broker, "create").returns({
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
