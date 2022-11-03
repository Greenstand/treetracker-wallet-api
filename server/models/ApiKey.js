const ApiKeyRepository = require('../repositories/ApiKeyRepository');

class ApiKey {
  constructor(session) {
    this._apiKeyRepository = new ApiKeyRepository(session);
  }

  async getByApiKey(apiKey) {
    return this._apiKeyRepository.getByApiKey(apiKey);
  }
}

module.exports = ApiKey;
