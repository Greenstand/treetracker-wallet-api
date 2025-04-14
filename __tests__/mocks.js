const sinon = require('sinon');
const JWTService = require('../server/services/JWTService');

exports.mochaHooks = {
  beforeAll(done) {
    sinon.stub(JWTService, 'verify').callsFake((authorization) => {
      const tokenArray = authorization.split('Bearer ');
      const token = tokenArray[1];
      return { id: token };
    });

    done();
  },
  afterAll(done) {
    sinon.restore();
    done();
  },
};
