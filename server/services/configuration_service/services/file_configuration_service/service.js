'use strict';

/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-require */
/* eslint-disable security/detect-non-literal-fs-filename */

/**
 * Module dependencies, required for ALL Plant.Works modules
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
 * @class   FileConfigurationService
 * @extends {PlantWorksBaseService}
 * @classdesc The Plant.Works Down Recorder file-based configuration sub-service.
 *
 * @description
 * Allows the rest of the codebase to CRUD their configurations from the filesystem.
 *
 */
class FileConfigurationService extends PlantWorksBaseService {
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
	 * @memberof FileConfigurationService
	 * @name     _setup
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Sets up the file watcher to watch for changes on the fly.
	 */
	async _setup() {
		try {
			await super._setup();

			const chokidar = require('chokidar'),
				path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			this.$watcher = chokidar.watch(path.join(rootPath, `config${path.sep}${plantworksEnv}`), {
				'ignored': /[/\\]\./,
				'ignoreInitial': true
			});

			this.$watcher
				.on('add', this._onNewConfiguration.bind(this))
				.on('change', this._onUpdateConfiguration.bind(this))
				.on('unlink', this._onDeleteConfiguration.bind(this));

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
	 * @memberof FileConfigurationService
	 * @name     _teardown
	 *
	 * @returns  {boolean} Boolean true/false.
	 *
	 * @summary  Shutdown the file watcher that watches for changes on the fly.
	 */
	async _teardown() {
		try {
			this.$watcher.close();

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
	 * @memberof FileConfigurationService
	 * @name     loadConfiguration
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires configuration.
	 *
	 * @returns  {object} - The plantworksModule's file-based configuration.
	 *
	 * @summary  Retrieves the configuration of the plantworksModule requesting for it.
	 */
	async loadConfiguration(plantworksModule) {
		try {
			let config = null;

			const plantworksModulePath = this.$parent._getPathForModule(plantworksModule);
			if(this.$cacheMap[plantworksModulePath]) return this.$cacheMap[plantworksModulePath];

			const fs = require('fs'),
				mkdirp = require('mkdirp'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(fs);
			const mkdirAsync = promises.promisifyAll(mkdirp);
			const rootPath = path.dirname(path.dirname(require.main.filename));
			const configPath = path.join(rootPath, `config${path.sep}${plantworksEnv}`, `${plantworksModulePath}.js`);

			await mkdirAsync(path.dirname(configPath));

			const doesExist = await this._exists(configPath, filesystem.R_OK);
			if(doesExist) config = require(configPath).config;

			this.$cacheMap[plantworksModulePath] = config;
			return config;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::loadConfig::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
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
			const deepEqual = require('deep-equal'),
				fs = require('fs'),
				mkdirp = require('mkdirp'),
				path = require('path'),
				promises = require('bluebird');

			const plantworksModulePath = this.$parent._getPathForModule(plantworksModule);
			if(deepEqual(this.$cacheMap[plantworksModulePath], config))
				return config;

			this.$cacheMap[plantworksModulePath] = config;

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const configPath = path.join(rootPath, `config${path.sep}${plantworksEnv}`, `${plantworksModulePath}.js`);

			const mkdirpAsync = promises.promisifyAll(mkdirp);
			await mkdirpAsync(path.dirname(configPath));

			const configString = `exports.config = ${safeJsonStringify(config, undefined, '\t')};\n`;

			const filesystem = promises.promisifyAll(fs);
			await filesystem.writeFileAsync(configPath, configString);

			return config;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::saveConfig::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
	 * @name     getModuleState
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its state.
	 *
	 * @returns  {boolean} - Boolean true always, pretty much.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage the state.
	 */
	async getModuleState(plantworksModule) {
		return !!plantworksModule;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
	 * @name     setModuleState
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its state.
	 * @param    {boolean} enabled - State of the module.
	 *
	 * @returns  {object} - The state of the plantworksModule.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage the state.
	 */
	async setModuleState(plantworksModule, enabled) {
		return enabled;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof FileConfigurationService
	 * @name     getModuleId
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage module ids.
	 */
	async getModuleId() {
		return null;
	}
	// #endregion

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _processConfigChange
	 *
	 * @param    {PlantWorksBaseModule} configUpdateModule - The plantworksModule for which the configuration changed.
	 * @param    {object} config - The updated configuration.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Persists the configuration to the filesystem.
	 */
	async _processConfigChange(configUpdateModule, config) {
		try {
			const deepEqual = require('deep-equal'),
				fs = require('fs'),
				mkdirp = require('mkdirp'),
				path = require('path'),
				promises = require('bluebird');

			if(deepEqual(this.$cacheMap[configUpdateModule], config))
				return;

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const configPath = path.join(rootPath, `config${path.sep}${plantworksEnv}`, configUpdateModule);

			this.$cacheMap[configUpdateModule] = config;

			const mkdirpAsync = promises.promisifyAll(mkdirp);
			await mkdirpAsync(path.dirname(configPath));

			const configString = `exports.config = ${safeJsonStringify(config, undefined, '\t')};`;

			const filesystem = promises.promisifyAll(fs);
			await filesystem.writeFileAsync(`${configPath}.js`, configString);
		}
		catch(err) {
			console.error(`Process changed configuration to file error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _processStateChange
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Empty method, since the file-based configuration module doesn't manage module states.
	 */
	async _processStateChange() {
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _onNewConfiguration
	 *
	 * @param    {string} filePath - The absolute path of the new configuration file.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Reads the new configuration, maps it to a loaded plantworksModule, and tells the rest of the configuration services to process it.
	 */
	async _onNewConfiguration(filePath) {
		try {
			const path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const plantworksModulePath = path.relative(rootPath, filePath).replace(`config${path.sep}${plantworksEnv}${path.sep}`, '').replace('.js', '');

			this.$cacheMap[plantworksModulePath] = require(filePath).config;
			this.$parent.emit('new-config', this.name, plantworksModulePath, this.$cacheMap[plantworksModulePath]);
		}
		catch(err) {
			console.error(`Process new configuration in ${filePath} error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _onUpdateConfiguration
	 *
	 * @param    {string} filePath - The absolute path of the updated configuration file.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Reads the new configuration, maps it to a loaded plantworksModule, and tells the rest of the configuration services to process it.
	 */
	async _onUpdateConfiguration(filePath) {
		try {
			const deepEqual = require('deep-equal'),
				path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const plantworksModulePath = path.relative(rootPath, filePath).replace(`config${path.sep}${plantworksEnv}${path.sep}`, '').replace('.js', '');

			delete require.cache[filePath];
			await snooze(500);

			if(deepEqual(this.$cacheMap[plantworksModulePath], require(filePath).config))
				return;

			this.$cacheMap[plantworksModulePath] = require(filePath).config;
			this.$parent.emit('update-config', this.name, plantworksModulePath, require(filePath).config);
		}
		catch(err) {
			console.error(`Process updated configuration in ${filePath} error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof FileConfigurationService
	 * @name     _onDeleteConfiguration
	 *
	 * @param    {string} filePath - The absolute path of the deleted configuration file.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Removes configuration from the cache, etc., and tells the rest of the configuration services to process it.
	 */
	async _onDeleteConfiguration(filePath) {
		try {
			const path = require('path');

			const rootPath = path.dirname(path.dirname(require.main.filename));
			const plantworksModulePath = path.relative(rootPath, filePath).replace(`config${path.sep}${plantworksEnv}${path.sep}`, '').replace('.js', '');

			delete require.cache[filePath];
			delete this.$cacheMap[plantworksModulePath];

			this.$parent.emit('delete-config', this.name, plantworksModulePath);
		}
		catch(err) {
			console.error(`Process deleted configuration in ${filePath} error: ${err.message}\n${err.stack}`);
		}
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

exports.service = FileConfigurationService;
