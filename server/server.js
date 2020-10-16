const app = require("./app");
//set the log level
require("./setup");
const port = process.env.NODE_PORT || 3006;
const log = require("loglevel");

app.listen(port,()=>{
    log.info('listening on port:' + port);
    log.debug("debug log level!");
});
