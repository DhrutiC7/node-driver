'use strict';

/**
 * Module dependencies, required for ALL Plant.Works' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module.
 *
 * @ignore
 */
const PlantWorksSrvcLoader = require('plantworks-service-loader').PlantWorksServiceLoader;
const PlantWorksSrvcError = require('plantworks-service-error').PlantWorksServiceError;

/**
 * @class   ConfigurationServiceLoader
 * @extends {PlantWorksServiceLoader}
 * @classdesc The specialized loader for the Plant.Works Down Recorder Configuration Service.
 *
 * @description
 * Runs load / init / start in one shot so that the rest of the codebase can access module-specific configurations
 * by the time they are loaded by the framework.
 *
 */
class ConfigurationServiceLoader extends PlantWorksSrvcLoader {
	// #region Constructor
	constructor(plantworksModule) {
		super(plantworksModule);
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof ConfigurationServiceLoader
	 * @name     load
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} - The load status of the {ConfigurationService}'s sub-modules.
	 *
	 * @summary  Loads sub-modules.
	 */
	async load(configSrvc) {
		let loadStatus = null;

		try {
			loadStatus = await super.load(configSrvc);
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.$plantworksModule.name}::load error`, err);
		}

		try {
			this.initStatus = await this.$plantworksModule.initialize();
		}
		catch(err) {
			this.initError = new PlantWorksSrvcError(`${this.$plantworksModule.name}::initialize error`, err);
		}

		try {
			this.startStatus = await this.$plantworksModule.start();
		}
		catch(err) {
			this.startError = new PlantWorksSrvcError(`${this.$plantworksModule.name}::start error`, err);
		}

		return loadStatus;
	}

	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof ConfigurationServiceLoader
	 * @name     initialize
	 *
	 * @returns  {object} - The initialization status of the {ConfigurationService}'s sub-modules.
	 *
	 * @summary  Initializes sub-modules.
	 */
	async initialize() {
		if(this.initError) throw this.initError;
		if(this.initStatus) return this.initStatus;

		try {
			const initStatus = await super.initialize();
			return initStatus;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.$plantworksModule.name}::initialize error`, err);
		}
	}

	/**
	 * @async
	 * @override
	 * @function
	 * @instance
	 * @memberof ConfigurationServiceLoader
	 * @name     start
	 *
	 * @returns  {object} - The start status of the {ConfigurationService}'s sub-modules.
	 *
	 * @summary  Starts sub-modules.
	 */
	async start() {
		if(this.startError) throw this.startError;
		if(this.startStatus) return this.startStatus;

		try {
			const startStatus = await super.start();
			return startStatus;
		}
		catch(err) {
			throw new PlantWorksSrvcError(`${this.$plantworksModule.name}::start error`, err);
		}
	}
	// #endregion
}

exports.loader = ConfigurationServiceLoader;
