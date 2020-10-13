const BaseRepository = require("./BaseRepository");
const expect = require("expect-runtime");
const Session = require("../models/Session");

class TransferRepository extends BaseRepository{
  constructor(session){
    expect(session).instanceOf(Session);
    super("transaction", session);
    this._session = session;
  }
}

module.exports = TransferRepository;
