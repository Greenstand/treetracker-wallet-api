'use strict';

// This is a JavaScript-based config file containing every Mocha option plus others.
// If you need conditional logic, you might want to use this type of config.
// Otherwise, JSON or YAML is recommended.

module.exports = {
    //'allow-uncaught': false,
    //'async-only': false,
    bail: false,
    //'check-leaks': false,
    color: true,
    //delay: false,
    //diff: true,
    exit: true, // could be expressed as "'no-exit': true"
    //extension: ['js'],
    // fgrep: something, // fgrep and grep are mutually exclusive
    //file: ['./__tests__/bootstrap.js'],
    //'forbid-only': false,
    //'forbid-pending': false,
    //'full-trace': false,
    //global: ['jQuery', '$'],
    //grep: tag, // fgrep and grep are mutually exclusive
    //growl: false,
    //'inline-diffs': false,
    // invert: false, // needs to be used with grep or fgrep
    //jobs: 1,
    package: './package.json',
    parallel: false,
    //recursive: false,
    reporter: 'spec',
    //'reporter-option': ['foo=bar', 'baz=quux'],
    require: './__tests__/e2e/libs/bootstrap.js',
    retries: 0,
    //slow: '75',
    //sort: false,
    //spec: ['./__tests__/*.test.js'],
    spec: ['./__tests__/e2e/database/*.test.js', './__tests__/e2e/__tests__/**/*.test.js'],
    timeout: '15000',
    //'trace-warnings': true, // node flags ok
    //ui: 'bdd',
    //'v8-stack-trace-limit': 100, // V8 flags are prepended with "v8-"
    //watch: false,
    //'watch-files': ['lib/**/*.js', 'test/**/*.js'],
    //'watch-ignore': ['lib/vendor']
};