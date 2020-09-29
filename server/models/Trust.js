const expect = require('expect-runtime');
const HttpError = require("../utils/HttpError");
const WalletRepository = require("../repositories/WalletRepository");
const TrustRepository = require("../repositories/TrustRepository");

class Trust{
  constructor(){
    this.trustRepository = new TrustRepository();
  }

  getTrustModel(){
    return this.trustRepository;
  }

}

module.exports = Trust;
