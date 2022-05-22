require('dotenv').config();

const server = process.env.RUN_E2E_LOCALLY
  ? require('../../server/app')
  : `https://${process.env.ENVIRONMENT}-k8s.treetracker.org/wallet`;
const request = require('supertest')(server);
const { expect } = require('chai');
const responseStatus = require('http-status-codes');
const assert = require('./libs/assertionLibrary.js');
const seed = require('./database/seed.js');

async function sendGetRequest(url, headers, body = {}) {
  return request.get(url).set(headers).send(body);
}

async function sendPostRequest(url, headers, body) {
  return request.post(url).set(headers).send(body);
}

module.exports = {
  sendGetRequest,
  sendPostRequest,
  expect,
  responseStatus,
  assert,
  seed,
};
