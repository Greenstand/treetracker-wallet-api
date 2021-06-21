'use strict';

// This is a JavaScript-based config file containing every Mocha option plus others.
// If you need conditional logic, you might want to use this type of config.

module.exports = {
    bail: false,
    color: true,
    diff: true,
    exit: true,
    package: './package.json',
    parallel: false,
    reporter: 'spec',
    require: './__tests__/e2e/libs/bootstrap.js',
    retries: 0,
    spec: ['./__tests__/e2e/database/*.test.js', './__tests__/e2e/__tests__/**/*.test.js'],
    timeout: '15000'
};