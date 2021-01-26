'use strict';

/* eslint-disable security/detect-object-injection */

/**
 * Module dependencies, required for ALL Plant.Works' modules
 * @ignore
 */
const safeJsonStringify = require('safe-json-stringify'); // eslint-disable-line no-unused-vars

/**
 * Module dependencies, required for this module
 * @ignore
 */
const PlantWorksBaseService = require('plantworks-base-service').PlantWorksBaseService;
const PlantWorksSrvcError = require('plantworks-service-error').PlantWorksServiceError;

/**
 * @class   DatabaseConfigurationService
 * @extends {PlantWorksBaseService}
 * @classdesc The Plant.Works Down Recorder PostgreSQL-based configuration sub-service.
 *
 * @description
 * Allows the rest of the codebase to CRUD their configurations from the PostgreSQL database.
 *
 */
class DatabaseConfigurationService extends PlantWorksBaseService {
	// #region Constructor
	constructor(parent) {
		super(parent);
		this.$cacheMap = {};
	}
	// #endregion

	// #region setup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     _setup
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Sets up the listener to watch for changes on the fly.
	 */
	async _setup() {
		try {
			await super._setup();

			if(!this.$parent.$config.subservices)
				return null;

			if(!this.$parent.$config.subservices[this.name])
				return null;

			const promises = require('bluebird');

			this.$config = this.$parent.$config.subservices[this.name];
			const thisConfig = JSON.parse(safeJsonStringify(this.$config));

			thisConfig.debug = (thisConfig.debug === true);

			if(thisConfig.connection) thisConfig.connection.port = Number(thisConfig.connection.port);

			if(thisConfig.pool) {
				thisConfig.pool.min = Number(thisConfig.pool.min);
				thisConfig.pool.max = Number(thisConfig.pool.max);

				thisConfig.pool['afterCreate'] = function(rawConnection, done) {
					const pgError = require('pg-error');

					rawConnection.connection.parseE = pgError.parse;
					rawConnection.connection.parseN = pgError.parse;

					rawConnection.connection.on('PgError', function(err) {
						switch (err.severity) {
							case 'ERROR':
							case 'FATAL':
							case 'PANIC':
								this.emit('error', err);
								break;

							default:
								this.emit('notice', err);
								break;
						}
					});

					promises.promisifyAll(rawConnection.connection);
					done();
				};
			}

			const pg = require('pg');

			this.$database = promises.promisifyAll(new pg.Client(thisConfig.connection));
			await this.$database.connectAsync();

			this.$database.on('notice', this._databaseNotice.bind(this));
			this.$database.on('notification', this._databaseNotification.bind(this));

			let rootModule = this.$parent;
			while(rootModule.$parent) rootModule = rootModule.$parent;

			await this.$database.queryAsync(`LISTEN "${rootModule.$application}!Config!Changed"`);
			await this.$database.queryAsync(`LISTEN "${rootModule.$application}!State!Changed"`);

			await this._reloadAllConfig();
			return null;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     _teardown
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Shutdown the database connection.
	 */
	async _teardown() {
		try {
			if(!this.$database)
				return null;

			let rootModule = this.$parent;
			while(rootModule.$parent) rootModule = rootModule.$parent;

			await this.$database.queryAsync(`UNLISTEN "${rootModule.$application}!Config!Changed"`);
			await this.$database.queryAsync(`UNLISTEN "${rootModule.$application}!State!Changed"`);

			this.$database.end();
			delete this.$database;

			await super._teardown();
			return null;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::_teardown error`, err);
		}
	}
	// #endregion

	// #region API
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     loadConfiguration
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires configuration.
	 *
	 * @returns  {object} - The plantworksModule's database-based configuration.
	 *
	 * @summary  Retrieves the configuration of the plantworksModule requesting for it.
	 */
	async loadConfiguration(plantworksModule) {
		try {
			if(!this.$database)
				return {};

			const plantworksModulePath = this.$parent._getPathForModule(plantworksModule);
			const cachedModule = this._getCachedModule(plantworksModulePath);
			if(cachedModule) return cachedModule.configuration;

			return {};
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::loadConfiguration::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     saveConfiguration
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires configuration.
	 * @param    {object} config - The {@link PlantWorksBaseModule}'s' configuration that should be persisted.
	 *
	 * @returns  {object} - The plantworksModule configuration.
	 *
	 * @summary  Saves the configuration of the plantworksModule requesting for it.
	 */
	async saveConfiguration(plantworksModule, config) {
		try {
			if(!this.$database)
				return {};

			const plantworksModulePath = this.$parent._getPathForModule(plantworksModule);
			const cachedModule = this._getCachedModule(plantworksModulePath);
			if(!cachedModule) return {};

			const deepEqual = require('deep-equal');
			if(deepEqual(cachedModule.configuration, config))
				return config;

			cachedModule.configuration = config;

			await this.$database.queryAsync('UPDATE modules SET configuration = $1 WHERE id = $2;', [config, cachedModule.module_id]);
			return config;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::saveConfiguration::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     getModuleState
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its state.
	 *
	 * @returns  {boolean} - The plantworksModule state (enabled / disabled).
	 *
	 * @summary  Retrieves and returns the module state.
	 */
	async getModuleState(plantworksModule) {
		try {
			const plantworksModulePath = this.$parent._getPathForModule(plantworksModule);
			const cachedModule = this._getCachedModule(plantworksModulePath);
			return cachedModule ? cachedModule.enabled : true;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::getModuleState::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     setModuleState
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its state.
	 * @param    {boolean} enabled - State of the module.
	 *
	 * @returns  {null} - The module state.
	 *
	 * @summary  Sets the module state in the database.
	 */
	async setModuleState(plantworksModule, enabled) {
		try {
			const plantworksModulePath = this.$parent._getPathForModule(plantworksModule);
			const cachedModule = this._getCachedModule(plantworksModulePath);
			if(!cachedModule) return enabled;

			if(cachedModule.enabled === enabled)
				return enabled;

			cachedModule.enabled = enabled;
			await this.$database.queryAsync('UPDATE modules SET enabled = $1 WHERE id = $2', [enabled, cachedModule.module_id]);

			return enabled;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::setModuleState::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof DatabaseConfigurationService
	 * @name     getModuleId
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its state.
	 *
	 * @returns  {null} - The database ID of the plantworksModule.
	 *
	 * @summary  Retrieves the configuration of the plantworksModule requesting for it.
	 */
	async getModuleId(plantworksModule) {
		try {
			const plantworksModulePath = this.$parent._getPathForModule(plantworksModule);
			const cachedModule = this._getCachedModule(plantworksModulePath);

			return cachedModule ? cachedModule.module_id : null;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::getModuleId::${plantworksModule.name} error`, err);
		}
	}

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof DatabaseConfigurationService
	 * @name     _processConfigChange
	 *
	 * @param    {string} configUpdateModule - The path of the module for which the configuration changed.
	 * @param    {object} config - The updated configuration.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Persists the configuration to the database.
	 */
	async _processConfigChange(configUpdateModule, config) {
		try {
			const cachedModule = this._getCachedModule(configUpdateModule);
			if(!cachedModule) return;

			const deepEqual = require('deep-equal');
			if(deepEqual(cachedModule.configuration, config))
				return;

			cachedModule.configuration = config;
			await this.$database.queryAsync('UPDATE modules SET configuration = $1 WHERE id = $2;', [config, cachedModule.module_id]);

			return;
		}
		catch(err) {
			console.error(`Process changed configuration to database error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof DatabaseConfigurationService
	 * @name     _processStateChange
	 *
	 * @param    {string} configUpdateModule - The path of the module for which the state changed.
	 * @param    {boolean} state - The updated state.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Persists the state to the database.
	 */
	async _processStateChange(configUpdateModule, state) {
		try {
			const cachedModule = this._getCachedModule(configUpdateModule);
			if(!cachedModule) return;

			if(cachedModule.enabled === state)
				return;

			cachedModule.enabled = state;
			await this.$database.queryAsync('UPDATE modules SET enabled = $1 WHERE id = $2;', [state, cachedModule.module_id]);

			return;
		}
		catch(err) {
			console.error(`Process changed state to database error: ${err.message}\n${err.stack}`);
		}
	}

	async _reloadAllConfig() {
		try {
			let serverModule = this.$parent;
			while(serverModule.$parent) serverModule = serverModule.$parent;

			const serverId = await this.$database.queryAsync('SELECT id AS module_id FROM modules WHERE name = $1 AND parent_id IS NULL', [serverModule.$application]);
			let moduleConfigs = null;

			if(serverId.rows.length) {
				moduleConfigs = await this.$database.queryAsync('SELECT A.*, B.id AS module_id, B.name, B.configuration, B.enabled FROM fn_get_module_descendants($1) A INNER JOIN modules B ON (A.id = B.id)', [serverId.rows[0]['module_id']]);
				moduleConfigs = moduleConfigs.rows;
			}

			this.$cachedMap = {};

			const configTree = this._reorderConfigsToTree(moduleConfigs, null);
			this._convertTreeToPaths(this.$cachedMap, '', configTree);

			return null;
		}
		catch(err) {
			console.error(`Reload configurations from database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_reorderConfigsToTree(moduleConfigs, parent) {
		const inflection = require('inflection');

		const filteredConfigs = moduleConfigs.filter((moduleConfig) => {
			return (moduleConfig.parent_id === parent);
		});

		const tree = {};
		filteredConfigs.forEach((filteredConfig) => {
			const relevantConfig = {
				'module_id': filteredConfig.module_id,
				'name': filteredConfig.name,
				'configuration': filteredConfig.configuration,
				'enabled': filteredConfig.enabled
			};

			const subModuleConfigs = this._reorderConfigsToTree(moduleConfigs, relevantConfig.module_id);
			Object.keys(subModuleConfigs).forEach((moduleType) => {
				relevantConfig[moduleType] = subModuleConfigs[moduleType];
			});

			if(filteredConfig.type === 'server') {
				tree['server'] = relevantConfig;
			}
			else {
				if(!tree[`${filteredConfig.type}s`]) tree[`${filteredConfig.type}s`] = {};
				tree[`${filteredConfig.type}s`][inflection.underscore(filteredConfig.name)] = relevantConfig;
			}
		});

		return tree;
	}

	_convertTreeToPaths(cachedMap, prefix, configTree) {
		const path = require('path');
		const plantworksModuleTypes = ['components', 'features', 'middlewares', 'services', 'templates'];

		Object.keys(configTree).forEach((key) => {
			let currentPrefix = path.join(prefix, key);
			if(currentPrefix.startsWith('/')) currentPrefix = currentPrefix.substring(1);

			if(cachedMap[currentPrefix])
				return;

			if((plantworksModuleTypes.indexOf(key) < 0) && !configTree[key]['configuration'])
				return;

			if(configTree[key]['configuration'])
				cachedMap[currentPrefix] = {
					'module_id': configTree[key]['module_id'],
					'name': configTree[key]['name'],
					'configuration': configTree[key]['configuration'],
					'enabled': configTree[key]['enabled']
				};

			this._convertTreeToPaths(cachedMap, currentPrefix, configTree[key]);
		});
	}

	_getCachedModule(plantworksModulePath) {
		try {
			return this.$cachedMap[plantworksModulePath];
		}
		catch(err) {
			console.error(`Get cached module error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_databaseNotification(data) {
		if(plantworksEnv === 'development' || plantworksEnv === 'test') console.log(`${this.name}::_databaseNotification: ${safeJsonStringify(data, null, '\t')}`);

		let rootModule = this.$parent;
		while(rootModule.$parent) rootModule = rootModule.$parent;

		if(data.channel === `${rootModule.$application}ConfigChange`) {
			this._databaseConfigurationChange(data.payload);
			return null;
		}

		if(data.channel === `${rootModule.$application}StateChange`) {
			this._databaseStateChange(data.payload);
			return null;
		}

		return null;
	}

	async _databaseConfigurationChange(moduleId) {
		try {
			const deepEqual = require('deep-equal');

			let plantworksModulePath = null;
			Object.keys(this.$cachedMap).forEach((cachedKey) => {
				if(this.$cachedMap[cachedKey]['module_id'] === moduleId)
					plantworksModulePath = cachedKey;
			});

			if(!plantworksModulePath) return null;

			const result = await this.$database.queryAsync('SELECT configuration FROM modules WHERE id = $1', [moduleId]);
			if(!result.rows.length) return null;

			if(deepEqual(this.$cachedMap[plantworksModulePath].configuration, result.rows[0].configuration))
				return null;

			this.$cachedMap[plantworksModulePath].configuration = result.rows[0].configuration;
			this.$parent.emit('update-config', this.name, plantworksModulePath, this.$cachedMap[plantworksModulePath].configuration);

			return null;
		}
		catch(err) {
			console.error(`Process updated config in database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	async _databaseStateChange(moduleId) {
		try {
			let plantworksModulePath = null;
			Object.keys(this.$cachedMap).forEach((cachedKey) => {
				if(this.$cachedMap[cachedKey]['module_id'] === moduleId)
					plantworksModulePath = cachedKey;
			});

			if(!plantworksModulePath) return null;

			const result = await this.$database.queryAsync('SELECT enabled FROM modules WHERE id = $1', [moduleId]);
			if(!result.rows.length) return null;

			if(this.$cachedMap[plantworksModulePath].enabled === result.rows[0].enabled)
				return null;

			this.$cachedMap[plantworksModulePath].enabled = result.rows[0].enabled;

			this.$parent.emit('update-state', this.name, plantworksModulePath, this.$cachedMap[plantworksModulePath].enabled);
			return null;
		}
		catch(err) {
			console.error(`Process updated state in database error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	_databaseQuery(queryData) {
		if((plantworksEnv === 'development' || plantworksEnv === 'test') && this.$config.debug) console.debug(`${this.name}::_databaseQuery: ${safeJsonStringify(queryData, undefined, '\t')}`);
	}

	_databaseNotice() {
		if((plantworksEnv === 'development' || plantworksEnv === 'test') && this.$config.debug) console.info(`${this.name}::_databaseNotice: ${safeJsonStringify(arguments, undefined, '\t')}`);
	}

	_databaseQueryError(error, query) {
		const queryLog = { 'sql': query.sql, 'bindings': query.bindings, 'options': query.options };
		this.$dependencies.LoggerService.error(`${this.name}::_databaseQueryError:\nQuery: ${safeJsonStringify(queryLog, null, '\t')}\nError: ${safeJsonStringify(error, null, '\t')}`);
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = DatabaseConfigurationService;
