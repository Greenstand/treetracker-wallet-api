/*
 * To define a extended error for API, can pass through the error message, http
 * code, to bring some convenient for the internal class to throw out the error
 * and the outside of the layer can catch the error and convert to a http
 * response to client
 */

class HttpError extends Error {
  // `reason` is a stable slug for cases a client must branch on, where the
  // status alone is ambiguous. It is sent in the response body.
  constructor(code, message, toRollback, reason) {
    super(message);
    this.code = code;
    this.reason = reason;
    // set rollback flag, so the transaction of db would rollback when catch this error
    // set default to true
    this._toRollback = toRollback || true;
  }

  shouldRollback() {
    return this._toRollback;
  }
}

module.exports = HttpError;
