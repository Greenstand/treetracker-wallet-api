const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * Assert that the expected value is included in the array/object
 * @param {Object} actual - actual value to be asserted
 * @param {Object} expected - expected value to be included
 * @param {string} message - explanation of assert failure
 */
function contains(actual, expected, message) {
    assert.include(actual, expected, message);
}

/**
 * Assert that the expected value equals with the actual one
 * @param {Object} actual - actual value to be asserted
 * @param {Object} expected - expected value to be compared
 * @param {string} message - explanation of assert failure
 * @param {Object} responseBody - response body content (optional)
 */
function equals(actual, expected, message, responseBody = {}) {
    assert.equal(actual, expected, `${message} Details: \n ${JSON.stringify(responseBody, undefined, 2)}`);
}

/**
 * Assert that the expected value not equals with the actual one
 * @param {Object} actual - actual value to be asserted
 * @param {Object} expected - expected value to be compared
 */
function notEqual(actual, expected) {
    assert.notEqual(actual, expected);
}

/**
 *
 * @param {String} failMessage - The message to show when breaking the test
 */
function breakTest(failMessage) {
    assert.fail(0, 1, failMessage);
}

module.exports = {
    contains,
    equals,
    notEqual,
    breakTest
};
