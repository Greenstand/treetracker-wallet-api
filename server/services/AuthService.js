const WalletService = require('./WalletService');
const JWTService = require('./JWTService');
const HashService = require('./HashService');

class AuthService {
  static async signIn({ wallet, password }) {
    const walletService = new WalletService();
    const walletObject = await walletService.getByName(wallet);

    const hash = HashService.sha512(password, walletObject.salt);

    if (hash === walletObject.password) {
      const token = JWTService.sign(walletObject);

      return token;
    }
    return false;
  }
}

module.exports = AuthService;
