/* eslint-disable security/detect-object-injection */

'use strict';

/**
 * Module dependencies, required for ALL Plant.Works' modules
 * @ignore
 */
const safeJsonStringify = require('safe-json-stringify'); // eslint-disable-line no-unused-vars

/**
 * Module dependencies, required for this module.
 *
 * @ignore
 */

const PlantWorksBaseModule = require('plantworks-base-module').PlantWorksBaseModule;
const PlantWorksBaseError = require('plantworks-base-error').PlantWorksBaseError;

/**
 * @class   PlantWorksApplication
 * @extends {PlantWorksBaseModule}
 *
 * @param   {PlantWorksBaseModule} [parent] - The parent module, if any. In this case, it's always null.
 * @param   {PlantWorksModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @classdesc The Plant.Works Persistence Server Application Class.
 *
 * @description
 * The Application Class for this server.
 *
 */
class PlantWorksApplication extends PlantWorksBaseModule {
	// #region Constructor
	constructor(application, parent, loader) {
		super(parent, loader);

		this.$application = application;
		this.$uuid = require('uuid/v4')();
	}
	// #endregion

	// #region Startup / Shutdown
	/**
	 * @function
	 * @instance
	 * @memberof PlantWorksApplication
	 * @name     bootupServer
	 *
	 * @returns  {Array} - The aggregated status returned by sub-modules (if any).
	 *
	 * @summary  Loads / Initializes / Starts-up sub-modules.
	 */
	async bootupServer() {
		if(plantworksEnv === 'development' || plantworksEnv === 'test') console.log(`${this.name}::bootupServer`);

		const allStatuses = [];
		let bootupError = null;

		try {

			let lifecycleStatuses = null;

			this.emit('server-loading');
			lifecycleStatuses = await this.load();
			allStatuses.push(`${process.title} load status: ${lifecycleStatuses ? safeJsonStringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-loaded');

			this.emit('server-initializing');
			lifecycleStatuses = await this.initialize();
			allStatuses.push(`${process.title} initialize status: ${lifecycleStatuses ? safeJsonStringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-initialized');

			this.emit('server-starting');
			lifecycleStatuses = await this.start();
			allStatuses.push(`${process.title} start status: ${lifecycleStatuses ? safeJsonStringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-started');

			this.emit('server-online');
		}
		catch(err) {
			bootupError = (err instanceof PlantWorksBaseError) ? err : new PlantWorksBaseError(`Bootup Error`, err);
			allStatuses.push(`Bootup error: ${bootupError.toString()}`);
		}

		if(!bootupError && ((plantworksEnv === 'development') || (plantworksEnv === 'test')))
			console.info(`\n\n${allStatuses.join('\n')}\n\n`);

		if(bootupError) {
			console.error(`\n\n${allStatuses.join('\n')}\n\n`);
			throw bootupError;
		}

		return null;
	}

	/**
	 * @function
	 * @instance
	 * @memberof PlantWorksApplication
	 * @name     shutdownServer
	 *
	 * @returns  {Array} - The aggregated status returned by sub-modules (if any).
	 *
	 * @summary  Shuts-down / Un-initializes / Un-loads sub-modules.
	 */
	async shutdownServer() {
		if(plantworksEnv === 'development' || plantworksEnv === 'test') console.log(`${this.name}::shutdownServer`);

		const allStatuses = [];
		let shutdownError = null;

		try {
			this.emit('server-offline');
			let lifecycleStatuses = null;

			this.emit('server-stopping');
			lifecycleStatuses = await this.stop();
			allStatuses.push(`${process.title} stop status: ${lifecycleStatuses ? safeJsonStringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-stopped');

			this.emit('server-uninitializing');
			lifecycleStatuses = await this.uninitialize();
			allStatuses.push(`${process.title} uninitialize status: ${lifecycleStatuses ? safeJsonStringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-uninitialized');

			this.emit('server-unloading');
			lifecycleStatuses = await this.unload();
			allStatuses.push(`${process.title} unload status: ${lifecycleStatuses ? safeJsonStringify(lifecycleStatuses, null, 2) : true}\n`);
			this.emit('server-unloaded');
		}
		catch(err) {
			shutdownError = (err instanceof PlantWorksBaseError) ? err : new PlantWorksBaseError(`Shutdown Error`, err);
			allStatuses.push(`Shutdown error: ${shutdownError.toString()}`);
		}

		if(!shutdownError && ((plantworksEnv === 'development') || (plantworksEnv === 'test')))
			console.info(`\n\n${allStatuses.join('\n')}\n\n`);

		if(shutdownError) {
			console.error(`\n\n${allStatuses.join('\n')}\n\n`);
			throw shutdownError;
		}

		return null;
	}
	// #endregion

	// #region Properties
	/**
	 * @member   {string} name
	 * @instance
	 * @override
	 * @memberof PlantWorksApplication
	 *
	 * @readonly
	 */
	get name() {
		return this.$application || this.constructor.name;
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.PlantWorksApplication = PlantWorksApplication;
