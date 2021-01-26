'use strict';

module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt); // eslint-disable-line node/no-unpublished-require

	grunt.initConfig({
		'pkg': grunt.file.readJSON('package.json'),

		'env': {
			'mochaTest': {
				'NODE_ENV': 'test'
			}

		},

		'eslint': {
			'options': {
				'config': '.eslintrc.json',
				'format': 'junit',
				'outputFile': 'buildresults/eslint-orig.xml'
			},
			'target': ['.']
		},

		'exec': {
			'clean': {
				'command': 'npm run-script clean'
			},
			'docs': {
				'command': 'npm run-script docs'
			},
			'organize_build_results': {
				'command': 'mkdir ./buildresults/mocha && mkdir ./buildresults/eslint && mkdir ./buildresults/istanbul && mv ./buildresults/lint.xml ./buildresults/eslint/results.xml && mv ./buildresults/tests.xml ./buildresults/mocha/results.xml && mv ./buildresults/cobertura-coverage.xml ./buildresults/istanbul/results.xml && mv ./buildresults/lcov.info ./buildresults/istanbul/lcov.info'
			},
			'rename-docs': {
				'command': 'mv ./jsdoc_default/downtime-recorder/<%= pkg.version %> ./docs && rm -r ./jsdoc_default'
			},
			'setup-test-db': {
				'command': 'cd ./knex_migrations && NODE_ENV=test ./../node_modules/.bin/knex seed:run && cd ..'
			},
			'undo-test-db': {
				'command': 'redis-cli flushall'
			}
		},

		'mochaTest': {
			'test': {
				'options': {
					'clearRequireCache': false,
					'noFail': false,
					'quiet': false,
					'recursive': true,
					'reporter': 'mocha-junit-reporter',
					'reporterOptions': {
						'mochaFile': './buildresults/tests.xml'
					},
					'require': ['./test/setup_mocks'],
					'timeout': 50000
				},

				'src': ['./test/**/*.spec.js']
			}
		},

		'mocha_istanbul': {
			'coverage': {
				'src': 'test',
				'options': {
					'mask': '**/*.spec.js',
					'coverageFolder': 'buildresults',
					'reportFormats': ['cobertura', 'lcovonly']
				}
			}
		},

		'xmlstoke': {
			'deleteESLintBugs': {
				'options': {
					'actions': [{
						'type': 'D',
						'xpath': '//failure[contains(@message, \'node_modules\')]/ancestor::testsuite'
					}]
				},
				'files': {
					'buildresults/eslint-no-bugs.xml': 'buildresults/eslint-orig.xml'
				}
			},
			'deleteEmptyTestcases': {
				'options': {
					'actions': [{
						'type': 'D',
						'xpath': '//testcase[not(node())]'
					}]
				},
				'files': {
					'buildresults/eslint-no-empty-testcases.xml': 'buildresults/eslint-no-bugs.xml'
				}
			},
			'deleteEmptyTestsuites': {
				'options': {
					'actions': [{
						'type': 'D',
						'xpath': '//testsuite[not(descendant::testcase)]'
					}]
				},
				'files': {
					'buildresults/eslint-no-empty-testsuites.xml': 'buildresults/eslint-no-empty-testcases.xml'
				}
			},
			'prettify': {
				'options': {
					'actions': [{
						'type': 'U',
						'xpath': '//text()'
					}]
				},
				'files': {
					'buildresults/lint.xml': 'buildresults/eslint-no-empty-testsuites.xml'
				}
			}
		},

		'jsbeautifier': {
			'src': ['buildresults/*.xml', 'docs/*.html'],
			'options': {
				'config': '.jsbeautifyrc'
			}
		},

		'clean': ['buildresults/eslint-orig.xml', 'buildresults/eslint-no-bugs.xml', 'buildresults/eslint-no-empty-testcases.xml', 'buildresults/eslint-no-empty-testsuites.xml', 'buildresults/coverage.raw.json']
	});

	grunt.loadNpmTasks('grunt-coveralls');
	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-env');
	grunt.loadNpmTasks('grunt-mocha-istanbul');
	grunt.loadNpmTasks('grunt-xmlstoke');

	grunt.registerTask('default', ['exec:clean', 'env', 'eslint', 'xmlstoke:deleteESLintBugs', 'xmlstoke:deleteEmptyTestcases', 'xmlstoke:deleteEmptyTestsuites', 'xmlstoke:prettify', 'exec:undo-test-db', 'exec:setup-test-db', 'mochaTest', 'exec:undo-test-db', 'exec:setup-test-db', 'mocha_istanbul:coverage', 'exec:docs', 'exec:rename-docs', 'clean', 'jsbeautifier', 'exec:organize_build_results', 'exec:undo-test-db', 'exec:setup-test-db']);
};
