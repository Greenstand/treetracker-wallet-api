
const Crypto = require('crypto');

const sha512 = function(password, salt){
    const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    const value = hash.digest('hex');
    return value;
};

const key = 'MyGreat38473';
const salt = 'j5qI1qb2rsgVBJvjiXx1isnR4bQW6Yd3';
const hash = sha512(key, salt);
console.log(`key: ${  key}`);
console.log(`salt: ${  salt}`);
console.log(`hash: ${  hash}`);
