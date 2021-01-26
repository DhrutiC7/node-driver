'use strict';

/**
 * Module dependencies, required for ALL Plant.Works modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const PlantWorksBaseModule = require('./plantworks-base-module').PlantWorksBaseModule;

/**
 * @class   PlantWorksBaseService
 * @extends {PlantWorksBaseModule}
 * @classdesc The Plant.Works Persistence Server Base Class for all Services.
 *
 * @param   {PlantWorksBaseModule} [parent] - The parent module, if any.
 * @param   {PlantWorksModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @description
 * Serves as the "base class" for all other services in the Plant.Works Persistence Server.
 *
 */
class PlantWorksBaseService extends PlantWorksBaseModule {
	// #region Constructor
	constructor(parent, loader) {
		super(parent, null);

		const PlantWorksSrvcLoader = require('./plantworks-service-loader').PlantWorksServiceLoader;
		const actualLoader = (loader instanceof PlantWorksSrvcLoader) ? loader : new PlantWorksSrvcLoader(this);

		this.$loader = actualLoader;
	}
	// #endregion

	// #region Properties
	/**
	 * @member   {object} Interface
	 * @override
	 * @instance
	 * @memberof PlantWorksBaseService
	 *
	 * @readonly
	 */
	get Interface() {
		return this;
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.PlantWorksBaseService = PlantWorksBaseService;
