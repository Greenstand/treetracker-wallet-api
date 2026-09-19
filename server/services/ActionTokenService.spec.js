/*
 * ActionTokenService resolves its signing secret once, when the module loads.
 * These tests load it afresh under a chosen environment (#573).
 */
const { expect } = require('chai');
const jwt = require('jsonwebtoken');

const MODULE_PATH = require.resolve('./ActionTokenService');

function setEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

// Drop the cached module, load it under the given environment, then restore
// both the environment and the cache entry so the instance the rest of the
// suite holds is untouched.
function loadWithEnv({ NODE_ENV, ACTION_TOKEN_SECRET }) {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    ACTION_TOKEN_SECRET: process.env.ACTION_TOKEN_SECRET,
  };
  const cached = require.cache[MODULE_PATH];
  delete require.cache[MODULE_PATH];
  try {
    setEnv('NODE_ENV', NODE_ENV);
    setEnv('ACTION_TOKEN_SECRET', ACTION_TOKEN_SECRET);
    return require('./ActionTokenService');
  } finally {
    setEnv('NODE_ENV', saved.NODE_ENV);
    setEnv('ACTION_TOKEN_SECRET', saved.ACTION_TOKEN_SECRET);
    delete require.cache[MODULE_PATH];
    if (cached) {
      require.cache[MODULE_PATH] = cached;
    }
  }
}

function verificationError(Service, link) {
  try {
    Service.verifyActionToken(link);
  } catch (error) {
    return error;
  }
  return undefined;
}

const payload = {
  sub: 'recipient@example.com',
  sender_wallet_id: '9b2b5a20-1f6e-4c3a-8d2e-0e1f2a3b4c5d',
  token_ids: ['0f8fad5b-d9cb-469f-a165-70867728950e'],
};

describe('ActionTokenService signing secret (#573)', () => {
  it('refuses to load without ACTION_TOKEN_SECRET outside the test environment', () => {
    expect(() =>
      loadWithEnv({ NODE_ENV: 'production', ACTION_TOKEN_SECRET: undefined }),
    ).to.throw(/ACTION_TOKEN_SECRET is not set/);
  });

  it('treats an empty ACTION_TOKEN_SECRET as missing, whatever NODE_ENV is', () => {
    expect(() =>
      loadWithEnv({ NODE_ENV: undefined, ACTION_TOKEN_SECRET: '' }),
    ).to.throw(/ACTION_TOKEN_SECRET is not set/);
  });

  it('signs and verifies links with the configured secret', () => {
    const Service = loadWithEnv({
      NODE_ENV: 'production',
      ACTION_TOKEN_SECRET: 'unit-test-secret-one',
    });
    const link = Service.signActionToken(payload);
    expect(Service.verifyActionToken(link)).to.include({
      sub: payload.sub,
      sender_wallet_id: payload.sender_wallet_id,
      action: 'send-token',
    });
  });

  it('refuses a link signed with a different secret, including the retired public fallback', () => {
    const Service = loadWithEnv({
      NODE_ENV: 'production',
      ACTION_TOKEN_SECRET: 'unit-test-secret-one',
    });
    const forged = jwt.sign(
      { ...payload, action: 'send-token' },
      'action-token-dev-secret',
      { issuer: 'greenstand', algorithm: 'HS256', expiresIn: '7d' },
    );
    const error = verificationError(Service, forged);
    expect(error).to.have.property('code', 401);
    expect(error).to.have.property(
      'message',
      'ERROR: ActionToken not verified',
    );

    const OtherService = loadWithEnv({
      NODE_ENV: 'production',
      ACTION_TOKEN_SECRET: 'unit-test-secret-two',
    });
    const otherError = verificationError(
      OtherService,
      Service.signActionToken(payload),
    );
    expect(otherError).to.have.property('code', 401);
  });

  it('falls back to a fixed secret only under NODE_ENV=test', () => {
    const Service = loadWithEnv({
      NODE_ENV: 'test',
      ACTION_TOKEN_SECRET: undefined,
    });
    const link = Service.signActionToken(payload);
    expect(Service.verifyActionToken(link)).to.include({ sub: payload.sub });
  });
});
