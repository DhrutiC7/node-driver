'use strict';

/**
 * Module dependencies, required for ALL Plant.Works' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const EventEmitter = require('events');

/**
 * @class   PlantWorksBaseClass
 * @extends {EventEmitter}
 * @classdesc The Plant.Works Server Base Class.
 *
 * @description
 * Serves as the "base class" for all other classes in the Plant.Works Persistence Server,
 * including {@link PlantWorksBaseModule} and {@link PlantWorksModuleLoader}.
 *
 */
class PlantWorksBaseClass extends EventEmitter {
	constructor() {
		super();

		this.on('error', this._handleUncaughtException.bind(this));
	}

	/**
	 * @function
	 * @instance
	 * @memberof PlantWorksBaseClass
	 * @name     _handleUncaughtException
	 *
	 * @param    {Error} err - The unhandled exception.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Logs Unhandled Exceptions to prevent the process from crashing.
	 */
	_handleUncaughtException(err) {
		console.error(`${this.name}::_handleUncaughtException: ${err.message}\n${err.stack}`);
	}

	/**
	 * @member   {string} name
	 * @instance
	 * @memberof PlantWorksBaseClass
	 *
	 * @readonly
	 */
	get name() {
		return this.constructor.name;
	}

	/**
	 * @member   {string} basePath
	 * @instance
	 * @memberof PlantWorksBaseClass
	 *
	 * @readonly
	 */
	get basePath() {
		return __dirname;
	}
}

exports.PlantWorksBaseClass = PlantWorksBaseClass;
