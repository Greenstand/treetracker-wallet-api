module.exports = {
    config: {
        "vhosts": {
            "test": {
              "connection": {
                  "url": process.env.RABBIT_MQ_URL,
                  "socketOptions": {
                      "timeout": 1000
                  }
              },
              "exchanges": ["wallet-service-ex"],
              "queues": ["token-transfer:events"],
              "bindings": [
                "wallet-service-ex[token.transfer] -> token-transfer:events"
              ],
              "publications": {
                "token-assigned": {
                  "exchange": "wallet-service-ex",
                  "routingKey": "token.transfer"
                }
              },
            }
        }
    }
}

