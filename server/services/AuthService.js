const WalletService = require('./WalletService');
const Event = require('../models/Event');
const Session = require('../infra/database/Session');
const JWTService = require('./JWTService');
const HashService = require('./HashService');

class AuthService {
  static async signIn({ wallet, password }) {
    const session = new Session();
    const event = new Event(session);
    const walletService = new WalletService();
    const walletObject = await walletService.getByIdOrName(wallet);

    const hash = HashService.sha512(password, walletObject.salt);

    if (hash === walletObject.password) {
      const token = JWTService.sign(walletObject);

      await event.logEvent({
        loggedInWalletId: walletObject.id,
        type: 'login',
        payload: {},
      });

      return token;
    }
    return false;
  }
}

module.exports = AuthService;
