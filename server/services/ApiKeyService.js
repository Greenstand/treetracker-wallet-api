const HttpError = require('../utils/HttpError');
const Session = require('../infra/database/Session');
const ApiKey = require('../models/ApiKey');

class ApiKeyService {
  constructor() {
    this._session = new Session();
    this._apiKey = new ApiKey(this._session);
  }

  async check(apiKey, url) {
    if (!apiKey) {
      throw new HttpError(401, 'Invalid access - no API key');
    }
    const result = await this._apiKey.getByApiKey(apiKey);

    if (!result) throw new HttpError(401, 'Invalid API access');
    if (result.tree_token_api_access === false) {
      throw new HttpError(401, 'Invalid API access, apiKey was deprecated');
    }
    if (!result.batch_create_access && url.includes('batch-create-wallet')) {
      throw new HttpError(
        401,
        'Invalid API access, no permission to access this endpoint',
      );
    }
  }
}

module.exports = ApiKeyService;
