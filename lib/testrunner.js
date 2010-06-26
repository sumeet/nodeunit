var nodeunit = require('./nodeunit'),
    sys = require('sys'),
    fs = require('fs'),
    libxmljs = require('../deps/libxmljs/libxmljs');



exports.run = function(files){

    var red   = function(str){return "\033[31m" + str + "\033[39m"};
    var green = function(str){return "\033[32m" + str + "\033[39m"};
    var bold  = function(str){return "\033[1m" + str + "\033[22m"};

    var start = new Date().getTime();

    var testSuite = {
        'errors': 0,
        'failures': 0,
        'tests': 0
    };
    var testCases = [];
    
    var xmlReport = function() {
        /*
        Returns JUnit style XML report as a string.
        */
        var doc = new libxmljs.Document(function(n) {
            n.node('testsuite', testSuite, function(n) {
                testCases.forEach(function(testCase) {
                    var nodeAttributes = {
                        'classname': testCase.classname,
                        'name': testCase.name,
                        'time': testCase.time,
                    };
                    n.node('testcase', nodeAttributes, function(n) {
                        testCase.failures.forEach(function(failure) {
                            var failureAttributes = {
                                'message': failure.message,
                                'type': failure.type
                            };
                            n.node(
                                'failure', failureAttributes, failure.stack
                            );
                        });
                    });
                });
            });
        });
        return doc.toString();
    };

    nodeunit.runFiles(files, {
        moduleStart: function(name){
            var pathAndFilename = name.split('/');
            var testFileName = pathAndFilename[pathAndFilename.length - 1];
            testSuite.name = testFileName.split('.js')[0];
            sys.puts('\n' + bold(name));
        },
        testDone: function(name, assertions){
            testSuite.tests++;
            var testCase = {
                'classname': testSuite.name,
                'name': name,
                'time': assertions.duration * 0.001,
                'failures': []
            };
            if(!assertions.failures){
                sys.puts('✔ ' + name);
            }
            else {
                sys.puts(red('✖ ' + name) + '\n');
                assertions.forEach(function(assertion){
                    if(assertion.failed()){
                        testSuite.failures++;
                        testCase.failures.push({
                            'message': assertion.error.message,
                            'type': assertion.error.name,
                            'stack': assertion.error.stack
                        });
                        sys.puts(assertion.error.stack + '\n');
                    }
                });
            }
            testCases.push(testCase);
        },
        done: function(assertions){
            fs.writeFileSync('TEST-' + testSuite.name + '.xml', xmlReport());
            var end = new Date().getTime();
            var duration = end - start;
            testSuite.time = assertions.duration * 0.001;
            if(assertions.failures){
                sys.puts(
                    '\n' + bold(red('FAILURES: ')) + assertions.failures +
                    '/' + assertions.length + ' assertions failed (' +
                    assertions.duration + 'ms)'
                );
            }
            else {
                sys.puts(
                    '\n' + bold(green('OK: ')) + assertions.length +
                    ' assertions (' + assertions.duration + 'ms)'
                );
            }
            process.reallyExit(assertions.failures);
        }
    });
};

// If this is run from the command-line:
if(module.id === '.'){
    require.paths.push(process.cwd());
    var args = process.ARGV.slice(2);
    exports.run(args);
}
