const BaseRepository = require("./BaseRepository");
const expect = require("expect-runtime");

class TransferRepository extends BaseRepository{
  constructor(session){
    super("transaction", session);
    this._session = session;
  }
}

module.exports = TransferRepository;
