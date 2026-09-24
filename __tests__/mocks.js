const sinon = require('sinon');
const JWTService = require('../server/services/JWTService');
const HttpError = require('../server/utils/HttpError');

exports.mochaHooks = {
  beforeAll(done) {
    sinon.stub(JWTService, 'verify').callsFake((authorization) => {
      // Mirror the real 401 rather than crashing on undefined, so a spec can
      // exercise the unauthenticated path.
      if (!authorization) {
        throw new HttpError(
          401,
          'ERROR: Authentication, no token supplied for protected path',
        );
      }
      const tokenArray = authorization.split('Bearer ');
      const token = tokenArray[1];
      // "<id>" or "<id>#<role>,<role>", so a spec can hand a handler the
      // keycloak roles it gates on without minting a real token.
      const [id, roles = ''] = token.split('#');
      return { id, roles: roles ? roles.split(',') : [] };
    });

    done();
  },
  afterAll(done) {
    sinon.restore();
    done();
  },
};
