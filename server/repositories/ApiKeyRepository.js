class ApiKeyRepository {
  constructor(session) {
    this._tableName = 'api_key';
    this._session = session;
  }

  async getByApiKey(apiKey) {
    const list = await this._session
      .getDB()
      .select()
      .table(this._tableName)
      .where({
        key: apiKey,
      });
    return list[0];
  }
}

module.exports = ApiKeyRepository;
