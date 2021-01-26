'use strict';

/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-require */

/**
 * Module dependencies, required for ALL Plant.Works' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const PlantWorksBaseService = require('plantworks-base-service').PlantWorksBaseService;
const PlantWorksSrvcError = require('plantworks-service-error').PlantWorksServiceError;

const ConfigurationServiceLoader = require('./loader').loader;

/**
 * @class   ConfigurationService
 * @extends {PlantWorksBaseService}
 * @classdesc The Plant.Works Down Recorder Configuration Service.
 *
 * @description
 * Serves as the "single source of truth" for configuration related operations across the rest of the codebase.
 *
 */
class ConfigurationService extends PlantWorksBaseService {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, null);

		loader = new ConfigurationServiceLoader(this);
		this.$loader = loader;
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ConfigurationService
	 * @name     load
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} - The aggregated status returned by sub-modules (if any) once they complete their loading.
	 *
	 * @summary  Loads sub-modules, if any.
	 */
	async load(configSrvc) {
		try {
			const path = require('path');
			this.$config = require(path.join(path.dirname(path.dirname(require.main.filename)), `config/${plantworksEnv}/server/services/configuration_service`)).config;

			this.on('new-config', this._processConfigChange.bind(this));
			this.on('update-config', this._processConfigChange.bind(this));
			this.on('delete-config', this._processConfigChange.bind(this));

			this.on('update-state', this._processStateChange.bind(this));

			const status = await super.load(configSrvc);

			if(!this.$prioritizedSubServices) {
				this.$prioritizedSubServices = [].concat(Object.keys(this.$services));

				this.$prioritizedSubServices.forEach((prioritizedService) => {
					this.$config.priorities[prioritizedService] = this.$config.priorities[prioritizedService] || 0;
				});

				this.$prioritizedSubServices.sort((left, right) => {
					return this.$config.priorities[left] - this.$config.priorities[right];
				});
			}

			return status;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::load error`, err);
		}
	}
	// #endregion

	// #region API
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     loadConfiguration
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires configuration.
	 *
	 * @returns  {object} - The merged configurations returned by sub-modules.
	 *
	 * @summary  Retrieves the configuration of the plantworksModule requesting for it.
	 */
	async loadConfiguration(plantworksModule) {
		const deepmerge = require('deepmerge');
		const emptyTarget = value => Array.isArray(value) ? [] : {};
		const clone = (value, options) => deepmerge(emptyTarget(value), value, options);

		const oldArrayMerge = (target, source, options) => {
			const destination = target.slice();

			source.forEach(function(e, i) {
				if(typeof destination[i] === 'undefined') {
					const cloneRequested = options.clone !== false;
					const shouldClone = cloneRequested && options.isMergeableObject(e);

					destination[i] = shouldClone ? clone(e, options) : e;
				}
				else if(options.isMergeableObject(e)) {
					destination[i] = deepmerge(target[i], e, options);
				}
				else if(target.indexOf(e) === -1) {
					destination.push(e);
				}
			});

			return destination;
		};

		try {
			const loadedConfigs = [];
			for(const subService of this.$prioritizedSubServices) {
				const plantworksModuleConfig = await this.$services[subService].loadConfiguration(plantworksModule);
				loadedConfigs.push(plantworksModuleConfig);
			}

			let mergedConfig = {};
			loadedConfigs.forEach((loadedConfig) => {
				if(!loadedConfig) return;
				mergedConfig = deepmerge(mergedConfig, loadedConfig, {
					'arrayMerge': oldArrayMerge
				});
			});

			await this.saveConfiguration(plantworksModule, mergedConfig);
			const enabled = await this.getModuleState(plantworksModule);

			return { 'configuration': mergedConfig, 'state': enabled };
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::loadConfiguration::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
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
			const subServiceNames = Object.keys(this.$services);

			// eslint-disable-next-line curly
			for(const subServiceName of subServiceNames) {
				await this.$services[subServiceName].saveConfiguration(plantworksModule, config);
			}

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
	 * @memberof ConfigurationService
	 * @name     getModuleState
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its state.
	 *
	 * @returns  {object} - The merged states returned by sub-modules.
	 *
	 * @summary  Retrieves the state of the plantworksModule requesting for it.
	 */
	async getModuleState(plantworksModule) {
		try {
			const subServiceNames = Object.keys(this.$services);

			const moduleStates = [];
			for(const subServiceName of subServiceNames) {
				const plantworksModuleState = await this.$services[subServiceName].getModuleState(plantworksModule);
				moduleStates.push(plantworksModuleState);
			}

			let moduleState = true;
			moduleStates.forEach((state) => {
				moduleState = moduleState && !!state;
			});

			return moduleState;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::getModuleState::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     setModuleState
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its state.
	 * @param    {boolean} enabled - State of the module.
	 *
	 * @returns  {object} - The state of the plantworksModule.
	 *
	 * @summary  Saves the state of the plantworksModule requesting for it.
	 */
	async setModuleState(plantworksModule, enabled) {
		try {
			const subServiceNames = Object.keys(this.$services);

			const moduleStates = [];
			for(const subServiceName of subServiceNames) {
				const plantworksModuleState = await this.$services[subServiceName].setModuleState(plantworksModule, enabled);
				moduleStates.push(plantworksModuleState);
			}

			let moduleState = true;
			moduleStates.forEach((state) => {
				moduleState = moduleState && !!state;
			});

			return moduleState;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::setModuleState::${plantworksModule.name} error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof ConfigurationService
	 * @name     getModuleId
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - Instance of the {@link PlantWorksBaseModule} that requires its id.
	 *
	 * @returns  {object} - The id of the plantworksModule.
	 *
	 * @summary  Retrieves the id of the plantworksModule requesting for it.
	 */
	async getModuleId(plantworksModule) {
		try {
			const subServiceNames = Object.keys(this.$services);

			const moduleIds = [];
			for(const subServiceName of subServiceNames) {
				const plantworksModuleId = await this.$services[subServiceName].getModuleId(plantworksModule);
				if(plantworksModuleId) moduleIds.push(plantworksModuleId);
			}

			let moduleId = null;
			moduleIds.forEach((plantworksModuleId) => {
				moduleId = plantworksModuleId;
			});

			return moduleId;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.name}::getModuleId::${plantworksModule.name} error`, err);
		}
	}
	// #endregion

	// #region Private Methods
	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _processConfigChange
	 *
	 * @param    {PlantWorksBaseService} eventFirerModule - The sub-configuration service that detected the config change.
	 * @param    {PlantWorksBaseModule} configUpdateModule - The plantworksModule for which the configuration changed.
	 * @param    {object} config - The updated configuration.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Syncs the configuration across all the configuration sources, and then tells the plantworksModule to reconfigure itself.
	 */
	_processConfigChange(eventFirerModule, configUpdateModule, config) {
		try {
			Object.keys(this.$services).forEach((subService) => {
				if(subService === eventFirerModule)
					return;

				this.$services[subService]._processConfigChange(configUpdateModule, config);
			});

			const currentModule = this._getModuleFromPath(configUpdateModule);
			if(currentModule) currentModule._reconfigure(config);
		}
		catch(err) {
			console.error(`${this.name}::_processConfigChange error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _processStateChange
	 *
	 * @param    {PlantWorksBaseService} eventFirerModule - The sub-configuration service that detected the state change.
	 * @param    {PlantWorksBaseModule} stateUpdateModule - The plantworksModule for which the state changed.
	 * @param    {boolean} state - The updated state of the plantworksModule.
	 *
	 * @returns  {null} - Nothing.
	 *
	 * @summary  Syncs the state across all the configuration sources, and then tells the plantworksModule to change its own state.
	 */
	_processStateChange(eventFirerModule, stateUpdateModule, state) {
		try {
			Object.keys(this.$services).forEach((subService) => {
				if(subService === eventFirerModule)
					return;

				this.$services[subService]._processStateChange(stateUpdateModule, state);
			});

			const currentModule = this._getModuleFromPath(stateUpdateModule);
			if(currentModule) currentModule._changeState(state);
		}
		catch(err) {
			console.error(`${this.name}::_processStateChange error: ${err.message}\n${err.stack}`);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _getModuleFromPath
	 *
	 * @param    {string} pathFromRoot - The loaded path (from the application class) of the module.
	 *
	 * @returns  {PlantWorksBaseModule} - The module at the given path.
	 *
	 * @summary  Given a path relative to the Application Class instance, retrieves the loaded plantworksModule object.
	 */
	_getModuleFromPath(pathFromRoot) {
		try {
			const inflection = require('inflection');
			const path = require('path');

			let currentModule = this.$parent,
				pathSegments = null;

			while(currentModule.$parent) currentModule = currentModule.$parent;

			pathSegments = pathFromRoot.split(path.sep);
			while(pathSegments.length) {
				let pathSegment = pathSegments.shift();
				if((pathSegment === 'server') || !currentModule)
					continue;

				let nextModule = currentModule[`${inflection.camelize(pathSegment)}`] || currentModule[`$${pathSegment}`] || currentModule[`${pathSegment}`];
				if(nextModule) {
					currentModule = nextModule;
					continue;
				}

				while(pathSegments.length) {
					pathSegment = `${pathSegment}_${pathSegments.shift()}`;
					nextModule = currentModule[`${inflection.camelize(pathSegment)}`] || currentModule[`$${pathSegment}`] || currentModule[`${pathSegment}`];

					if(nextModule) {
						currentModule = nextModule;
						break;
					}
				}
			}

			return currentModule;
		}
		catch(err) {
			console.error(`${this.name}::_getModuleFromPath error: ${err.message}\n${err.stack}`);
			return null;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @private
	 * @memberof ConfigurationService
	 * @name     _getPathForModule
	 *
	 * @param    {PlantWorksBaseModule} plantworksModule - The module for which to generate the path.
	 *
	 * @returns  {string} - The path of the module, relative to the Application Class.
	 *
	 * @summary  Given a loaded plantworksModule object, return the path relative to the Application Class instance.
	 */
	_getPathForModule(plantworksModule) {
		try {
			if(!plantworksModule.$parent) return 'server';

			const inflection = require('inflection');
			const path = require('path');

			let currentModule = plantworksModule;

			const pathSegments = [];
			pathSegments.push(inflection.underscore(currentModule.name));

			while(currentModule.$parent) {
				const modulePrototype = Object.getPrototypeOf(Object.getPrototypeOf(currentModule)).name;
				const parentModule = currentModule.$parent;

				const plantworksModuleType = `${modulePrototype.replace('PlantWorksBase', '').toLowerCase()}s`;
				pathSegments.unshift(plantworksModuleType);

				currentModule = parentModule;
				if(currentModule && currentModule.$parent) pathSegments.unshift(inflection.underscore(currentModule.name));
			}

			pathSegments.unshift('server');
			return pathSegments.join(path.sep);
		}
		catch(err) {
			console.error(`${this.name}::_getPathForModule error: ${err.message}\n${err.stack}`);
			return null;
		}
	}
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get Interface() {
		return {
			'loadConfiguration': this.loadConfiguration.bind(this),
			'saveConfiguration': this.loadConfiguration.bind(this),
			'getModuleState': this.getModuleState.bind(this),
			'setModuleState': this.setModuleState.bind(this),
			'getModuleID': this.getModuleId.bind(this)
		};
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.service = ConfigurationService;
