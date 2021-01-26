'use strict';

exports.seed = async function(knex) {

	// Step 1: See if the seed file has already run. If yes, simply return
	let parentId = await knex.raw(`SELECT id FROM modules WHERE name = ? AND type = 'server' AND parent_id IS NULL`, ['PlantWorksDriver']);
	if(parentId.rows.length) {
		parentId = parentId.rows[0]['id'];
	}
	else {
		// Step 2: Insert the data for the "server" into the modules table
		parentId = await knex('modules').insert({
			'name': 'PlantWorksDriver',
			'type': 'server',
			'deploy': 'default',
			'configuration': {
				'title': 'Plant.Works Driver'
			},
			'configuration_schema': {
				'type': 'object',
				'properties': {
					'title': {
						'type': 'string'
					}
				}
			},
			'metadata': {
				'author': 'Plant.Works',
				'version': '1.0.0',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		})
		.returning('id');

		parentId = parentId[0];

		// Step 3: Insert the data for all the standard services that ship with the codebase into the modules table
		await knex('modules').insert({
			'parent_id': parentId,
			'type': 'service',
			'deploy': 'admin',
			'name': 'ApiService',
			'metadata': {
				'author': 'Plant.Works',
				'version': '2.19.8',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		});

		await knex('modules').insert({
			'parent_id': parentId,
			'type': 'service',
			'deploy': 'admin',
			'name': 'CacheService',
			'metadata': {
				'author': 'Plant.Works',
				'version': '1.0.0',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		});

		let configSrvcId = await knex('modules').insert({
			'parent_id': parentId,
			'type': 'service',
			'deploy': 'admin',
			'name': 'ConfigurationService',
			'metadata': {
				'author': 'Plant.Works',
				'version': '1.0.0',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		})
		.returning('id');

		configSrvcId = configSrvcId[0];

		await knex('modules').insert({
			'parent_id': configSrvcId,
			'type': 'service',
			'deploy': 'admin',
			'name': 'DatabaseConfigurationService',
			'metadata': {
				'author': 'Plant.Works',
				'version': '1.0.0',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		});

		await knex('modules').insert({
			'parent_id': configSrvcId,
			'type': 'service',
			'deploy': 'admin',
			'name': 'FileConfigurationService',
			'metadata': {
				'author': 'Plant.Works',
				'version': '1.0.0',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		});

		await knex('modules').insert({
			'parent_id': parentId,
			'type': 'service',
			'deploy': 'admin',
			'name': 'DatabaseService',
			'metadata': {
				'author': 'Plant.Works',
				'version': '1.0.0',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		});

		await knex('modules').insert({
			'parent_id': parentId,
			'type': 'service',
			'deploy': 'admin',
			'name': 'LoggerService',
			'metadata': {
				'author': 'Plant.Works',
				'version': '1.0.0',
				'website': 'https://plant.works',
				'demo': 'https://plant.works',
				'documentation': 'https://plant.works'
			}
		});

	}
};
