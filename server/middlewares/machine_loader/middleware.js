/* eslint-disable security/detect-object-injection */

'use strict';

/**
 * Module dependencies, required for ALL Plant.Works' modules.
 *
 * @ignore
 */
const promises = require('bluebird');
const safeJsonStringify = require('safe-json-stringify'); // eslint-disable-line no-unused-vars
const moment = require('moment-timezone');
const convertHRTime = require('convert-hrtime');
/**
 * Module dependencies, required for this module.
 *
 * @ignore
 */
const PlantWorksBaseMiddleware = require('plantworks-base-middleware').PlantWorksBaseMiddleware;
const PlantWorksMiddlewareError = require('plantworks-middleware-error').PlantWorksMiddlewareError;

/**
 * @class   MachineLoader
 * @extends {PlantWorksBaseMiddleware}
 *
 *
 */
class MachineLoader extends PlantWorksBaseMiddleware {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, loader);
	}
	// #endregion

	// #region startup/teardown code
	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ApiService
	 * @name     _setup
	 *
	 * @returns  {null} Nothing.
	 *
	 * @summary  Sets up the broker to manage API exposed by other modules.
	 */
	async _setup() {
		try {
            await super._setup();
            
            // initialize data interface for each machine
            this.$machines = this.$config.machines;

			for(let machine of this.$machines) {

				if(machine['data-interface'] === 'modbus') {
					const MachineDataInterface = require('./data_interfaces/modbus').Interface;
					const machineInterface = new MachineDataInterface(machine);
					machine['interface'] = machineInterface;

					machine.interface.startup();
				}
			}

			return null;
		}
		catch(err) {
			throw new PlantWorksMiddlewareError(`${this.name}::_setup error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @override
	 * @instance
	 * @memberof ApiService
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Deletes the broker that manages API.
	 */
	async _teardown() {
		await super._teardown();

		for(let machine of this.$machines) {
			try {
				if(!machine.interface) continue;
				machine.interface.shutdown();
			}
			catch(err) {
				throw new PlantWorksMiddlewareError(`${this.name}::_teardown`, err);
			}
		}

		return null;
	}
	// #endregion

	// #region Protected methods
	async _registerApis() {
		try {
			await super._registerApis();
			return null;
		}
		catch(err) {
			throw new PlantWorksMiddlewareError(`${this.name}::_registerApis`, err);
		}
	}

	async _deregisterApis() {
		try {
			await super._deregisterApis();
			return null;
		}
		catch(err) {
			throw new PlantWorksMiddlewareError(`${this.name}::_deregisterApis`, err);
		}
	}
	// #endregion

	// #region API
	
	// #endregion

	// #region Private Methods
	// #endregion

	// #region Properties
	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}

	/**
	 * @override
	 */
	get dependencies() {
		return ['ApiService', 'CacheService', 'ConfigurationService', 'DatabaseService', 'LoggerService'].concat(super.dependencies);
	}
	// #endregion
}

exports.middleware = MachineLoader;
