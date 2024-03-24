const session = require('express-session');

const memoryStore = new session.MemoryStore();

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
});

module.exports = { sessionMiddleware, memoryStore };
