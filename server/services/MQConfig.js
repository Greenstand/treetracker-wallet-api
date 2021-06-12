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
                "exchanges": ["field-data"],
                "queues": ["field-data-events", "field-data:verifications"],
                "publications": {
                    "raw-capture-created": {
                        "exchange": "field-data"
                    }
                },
                "subscriptions": {
                    "admin-verification": {
                        "queue": "field-data:verifications"
                    }
                }
            }
        }
    }
}

