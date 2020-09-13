const app = require("./app");
const port = process.env.NODE_PORT || 3006;

app.listen(port,()=>{
    console.log('listening on port:' + port);
});
