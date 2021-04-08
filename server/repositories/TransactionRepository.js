const expect = require("expect-runtime");
const BaseRepository = require("./BaseRepository");

class TransferRepository extends BaseRepository{
  constructor(session){
    super("transaction", session);
    this._session = session;
  }
}

module.exports = TransferRepository;
