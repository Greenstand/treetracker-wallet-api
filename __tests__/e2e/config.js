//const request = require("supertest")(process.env.ENV);
const request = require("supertest")("https://dev-k8s.treetracker.org/wallet");
const expect = require("chai").expect;
const responseStatus = require("http-status-codes");
const assert = require("./libs/assertionLibrary.js");
const seed = require("./database/seed.js");

async function sendGetRequest(url, headers, body = {}) {
    return request
        .get(url)
        .set(headers)
        .send(body);
}

async function sendPostRequest(url, headers, body) {
    return request
        .post(url)
        .set(headers)
        .send(body);
}

module.exports = {
    sendGetRequest,
    sendPostRequest,
    expect,
    responseStatus,
    assert,
    seed
};