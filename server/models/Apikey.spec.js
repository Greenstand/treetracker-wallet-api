const { expect } = require('chai');
const sinon = require('sinon');
const ApiKeyRepository = require('../repositories/ApiKeyRepository');
const ApiKey = require('./ApiKey');

describe('ApiKey Model', () => {
  it('get api key', async () => {
    const getApiKeyStub = sinon
      .stub(ApiKeyRepository.prototype, 'getByApiKey')
      .resolves('apikey');

    const apikeyModel = new ApiKey();
    const gottenApiKey = await apikeyModel.getByApiKey();

    expect(gottenApiKey).eql('apikey');
    getApiKeyStub.restore();
  });
});
