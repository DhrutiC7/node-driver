'use strict';

exports.seed = async function(knex) {
	let parentId = await knex.raw(`SELECT id FROM modules WHERE name = ? AND type = 'server' AND parent_id IS NULL`, ['PlantWorksDriver']);
	if(!parentId.rows.length)
		return null;

	parentId = parentId.rows[0]['id'];

	let componentId = await knex.raw(`SELECT id FROM fn_get_module_descendants(?) WHERE name = ? AND type = 'middleware'`, [parentId, 'MachineLoader']);
	if(componentId.rows.length)
		return null;

	await knex('modules').insert({
		'parent_id': parentId,
		'type': 'middleware',
		'deploy': 'default',
		'name': 'MachineLoader',
		'metadata': {
			'author': 'Plant.Works',
			'version': '1.0.0',
			'website': 'https://plant.works',
			'demo': 'https://plant.works',
			'documentation': 'https://plant.works'
		}
	});
};
