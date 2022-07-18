const WalletService = require('./WalletService');
const JWTService = require('./JWTService');
const { sha512 } = require('./HashService');

class AuthService {
  static async signIn({ wallet, password }) {
    const walletService = new WalletService();
    const walletObject = await walletService.getByIdOrName(wallet);

    const hash = sha512(password, walletObject.salt);

    if (hash === walletObject.password) {
      const token = JWTService.sign(walletObject);

      return token;
    }
    return false;
  }
}

module.exports = AuthService;
