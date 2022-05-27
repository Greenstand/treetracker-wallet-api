const Crypto = require('crypto');

const sha512 = (password, salt) => {
  const hash = Crypto.createHmac(
    'sha512',
    salt,
  ); /** Hashing algorithm sha512 */
  hash.update(password);
  const value = hash.digest('hex');
  return value;
};

module.exports = { sha512 };
