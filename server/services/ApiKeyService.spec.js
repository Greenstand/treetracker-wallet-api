const { expect } = require('chai');
const sinon = require('sinon');
const ApiKeyService = require('./ApiKeyService');
const ApiKey = require('../models/ApiKey');

describe('ApiKey', () => {
  let apiKey;

  before(() => {
    apiKey = new ApiKeyService();
  });

  it('empty key should throw error', async () => {
    let error;
    try {
      await apiKey.check();
    } catch (e) {
      error = e;
    }
    expect(error.message).eql('Invalid access - no API key');
  });

  it('key which do not exist should throw error', async () => {
    let error;
    const getApiKeyStub = sinon
      .stub(ApiKey.prototype, 'getByApiKey')
      .resolves();
    try {
      await apiKey.check('api key');
    } catch (e) {
      error = e;
    }
    expect(error.message).eql('Invalid API access');
    getApiKeyStub.restore();
  });

  it('key with false tree_token_api_access should not pass', async () => {
    let error;
    const getApiKeyStub = sinon
      .stub(ApiKey.prototype, 'getByApiKey')
      .resolves({ tree_token_api_access: false });
    try {
      await apiKey.check('api key');
    } catch (e) {
      error = e;
    }
    expect(error.message).eql('Invalid API access, apiKey was deprecated');
    getApiKeyStub.restore();
  });

  it('good key should pass', async () => {
    sinon.stub(ApiKey.prototype, 'getByApiKey').returns({});
    await apiKey.check('not_exist', '');
    ApiKey.prototype.getByApiKey.restore();
  });
});
