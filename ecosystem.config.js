'use strict';

module.exports = {
	'apps': [{
		'name': 'plantworks-driver',
		'script': 'server/index.js',

		'watch': false,
		'ignore_watch': [],

		'merge_logs': true,

		'env': {
			// 'BLUEBIRD_DEBUG': 1,
			// 'DEBUG': '*',
			'NODE_ENV': 'development'
		},
		'env_test': {
			'BLUEBIRD_DEBUG': 1,
			'DEBUG': '*',
			'NODE_ENV': 'test'
		},
		'env_production': {
			'NODE_ENV': 'production'
		}
	}]
};
