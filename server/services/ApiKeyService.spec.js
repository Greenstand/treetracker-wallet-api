const jestExpect = require('expect');
const sinon = require('sinon');
const ApiKeyService = require('./ApiKeyService');
const ApiKeyRepository = require('../repositories/ApiKeyRepository');
const HttpError = require('../utils/HttpError');
const Session = require('../infra/database/Session');

describe('ApiKey', () => {
  let apiKey;

  before(() => {
    apiKey = new ApiKeyService(new Session());
  });

  it('empty key should throw error', async () => {
    await jestExpect(async () => {
      await apiKey.check(undefined);
    }).rejects.toThrow(/no API key/);
  });

  it('key which do not exist should throw error', async () => {
    sinon
      .stub(ApiKeyRepository.prototype, 'getByApiKey')
      .throws(new HttpError(404));
    await jestExpect(async () => {
      await apiKey.check('not_exist');
    }).rejects.toThrow(/Invalid/);
    ApiKeyRepository.prototype.getByApiKey.restore();
  });

  it('good key should pass', async () => {
    sinon.stub(ApiKeyRepository.prototype, 'getByApiKey').returns({});
    await apiKey.check('not_exist');
    ApiKeyRepository.prototype.getByApiKey.restore();
  });
});
