const BaseRepository = require("./BaseRepository");

class TransferRepository extends BaseRepository{
  constructor(){
    super("transaction");
  }
}

module.exports = TransferRepository;
