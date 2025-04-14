const Crypto = require('crypto');

class HashService {
  static sha512(password, salt) {
    const hash = Crypto.createHmac(
      'sha512',
      salt,
    ); /** Hashing algorithm sha512 */
    hash.update(password);
    const value = hash.digest('hex');
    return value;
  }
}

module.exports = HashService;
