const WalletService = require('./WalletService');
const EventService = require('./EventService');
const JWTService = require('./JWTService');
const HashService = require('./HashService');
const EventEnums = require('../utils/event-enum');

class AuthService {
  static async signIn({ wallet, password }) {
    const eventService = new EventService();
    const walletService = new WalletService();
    const walletObject = await walletService.getByIdOrName(wallet);

    const hash = HashService.sha512(password, walletObject.salt);

    if (hash === walletObject.password) {
      const token = JWTService.sign(walletObject);

      await eventService.logEvent({
        wallet_id: walletObject.id,
        type: EventEnums.AUTH.login,
        payload: {},
      });

      return token;
    }
    return false;
  }
}

module.exports = AuthService;
