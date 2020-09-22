/*
 * To define a extended error for API, can pass through the error message, http 
 * code, to bring some convenient for the internal class to throw out the error 
 * and the outside of the layer can catch the error and convert to a http 
 * response to client
 */

class HttpError extends Error {
  constructor(message, code){
    super(message);
    this.code = code;
  }
}

module.exports = HttpError;
