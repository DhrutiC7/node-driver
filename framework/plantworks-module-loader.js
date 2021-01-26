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
const PlantWorksBaseClass = require('./plantworks-base-class').PlantWorksBaseClass;
const PlantWorksBaseError = require('./plantworks-base-error').PlantWorksBaseError;

const PlantWorksBaseService = require('./plantworks-base-service').PlantWorksBaseService;

/**
 * @class   PlantWorksModuleLoader
 * @extends {PlantWorksBaseClass}
 * @classdesc The Plant.Works Server Base Class for all Module Loaders.
 *
 * @param   {PlantWorksBaseModule} [plantworksModule] - The parent module, if any.
 *
 * @description
 * Serves as the "base class" for all other loaders in the Plant.Works Persistence Server, including {@link PlantWorksComponentLoader},
 * {@link PlantWorksMiddlewareLoader}, and {@link PlantWorksServiceLoader}.
 *
 * Responsible for invoking the standard "lifecycle" hooks on sub-modules of this module, if any - see {@link PlantWorksBaseModule#load},
 * {@link PlantWorksBaseModule#initialize}, {@link PlantWorksBaseModule#start}, {@link PlantWorksBaseModule#stop}, {@link PlantWorksBaseModule#uninitialize},
 * and {@link PlantWorksBaseModule#unload}.
 *
 */
class PlantWorksModuleLoader extends PlantWorksBaseClass {
	// #region Constructor
	constructor(plantworksModule) {
		super();

		Object.defineProperties(this, {
			'$plantworksModule': {
				'get': () => { return plantworksModule; }
			}
		});
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     load
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} - The load status of $plantworksModule's sub-modules.
	 *
	 * @summary  Loads sub-modules.
	 */
	async load(configSrvc) {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._loadUtilities(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._loadServices(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			// Special case.... if the server is loading, configSrvc will be null
			// so re-look at the loaded services and set the configSrvc to the loaded one
			if(!this.$plantworksModule.$parent && !configSrvc) configSrvc = this.$plantworksModule.$services['ConfigurationService'];

			lifecycleStatuses = await this._loadMiddlewares(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._loadComponents(configSrvc);
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			// Features are loaded only for servers or templates, and not for services, middlewares, etc....
			if(!this.$plantworksModule.$parent || (Object.getPrototypeOf(Object.getPrototypeOf(this.$plantworksModule)).name === 'PlantWorksBaseFeature')) {
				lifecycleStatuses = await this._loadFeatures(configSrvc);
				if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
					throw lifecycleStatuses.status;

				allStatuses.push(lifecycleStatuses);
			}

			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::load error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     initialize
	 *
	 * @returns  {object} - The initialization status of $plantworksModule's sub-modules.
	 *
	 * @summary  Initializes sub-modules.
	 */
	async initialize() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._initializeServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._initializeMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._initializeComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			if(!this.$plantworksModule.$parent || (Object.getPrototypeOf(Object.getPrototypeOf(this.$plantworksModule)).name === 'PlantWorksBaseFeature')) {
				lifecycleStatuses = await this._initializeFeatures();
				if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
					throw lifecycleStatuses.status;

				allStatuses.push(lifecycleStatuses);
			}

			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::initialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     start
	 *
	 * @returns  {object} - The start status of $plantworksModule's sub-modules.
	 *
	 * @summary  Starts sub-modules.
	 */
	async start() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			lifecycleStatuses = await this._startServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._startMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._startComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			if(!this.$plantworksModule.$parent || (Object.getPrototypeOf(Object.getPrototypeOf(this.$plantworksModule)).name === 'PlantWorksBaseFeature')) {
				lifecycleStatuses = await this._startFeatures();
				if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
					throw lifecycleStatuses.status;

				allStatuses.push(lifecycleStatuses);
			}

			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::start error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     stop
	 *
	 * @returns  {object} - The stop status of $plantworksModule's sub-modules.
	 *
	 * @summary  Stops sub-modules.
	 */
	async stop() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			if(!this.$plantworksModule.$parent || (Object.getPrototypeOf(Object.getPrototypeOf(this.$plantworksModule)).name === 'PlantWorksBaseFeature')) {
				lifecycleStatuses = await this._stopFeatures();
				if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
					throw lifecycleStatuses.status;

				allStatuses.push(lifecycleStatuses);
			}

			lifecycleStatuses = await this._stopComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._stopMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._stopServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::stop error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     uninitialize
	 *
	 * @returns  {object} - The uninitialization status of $plantworksModule's sub-modules.
	 *
	 * @summary  Un-initializes sub-modules.
	 */
	async uninitialize() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			if(!this.$plantworksModule.$parent || (Object.getPrototypeOf(Object.getPrototypeOf(this.$plantworksModule)).name === 'PlantWorksBaseFeature')) {
				lifecycleStatuses = await this._uninitializeFeatures();
				if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
					throw lifecycleStatuses.status;

				allStatuses.push(lifecycleStatuses);
			}

			lifecycleStatuses = await this._uninitializeComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._uninitializeMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._uninitializeServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::uninitialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     unload
	 *
	 * @returns  {object} - The unloading status of $plantworksModule's sub-modules.
	 *
	 * @summary  Unloads sub-modules.
	 */
	async unload() {
		try {
			const allStatuses = [];
			let lifecycleStatuses = null;

			if(!this.$plantworksModule.$parent || (Object.getPrototypeOf(Object.getPrototypeOf(this.$plantworksModule)).name === 'PlantWorksBaseFeature')) {
				lifecycleStatuses = await this._unloadFeatures();
				if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
					throw lifecycleStatuses.status;

				allStatuses.push(lifecycleStatuses);
			}

			lifecycleStatuses = await this._unloadComponents();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._unloadMiddlewares();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._unloadServices();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);

			lifecycleStatuses = await this._unloadUtilities();
			if(lifecycleStatuses && lifecycleStatuses.status && (lifecycleStatuses.status instanceof Error))
				throw lifecycleStatuses.status;

			allStatuses.push(lifecycleStatuses);
			return this._filterStatus(allStatuses);
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::unload error`, err);
		}
	}
	// #endregion

	// #region Utilities Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _loadUtilities
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} Object containing the load status of each of the $plantworksModule utilities.
	 *
	 * @summary  Load utilities defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _loadUtilities(configSrvc) { // eslint-disable-line no-unused-vars
		const path = require('path');
		const promises = require('bluebird');

		try {
			if(!this.$plantworksModule.$utilities) this.$plantworksModule.$utilities = {};

			const definedUtilities = await this._findFiles(path.join(this.$plantworksModule.basePath, 'utilities'), 'utility.js');
			for(const definedUtility of definedUtilities) {
				const utility = require(definedUtility).utility;
				if(!utility) continue;

				if(!utility.name || !utility.method)
					continue;

				this.$plantworksModule.$utilities[utility.name] = utility.method.bind(this.$plantworksModule);
				if(utility.isAsync) this.$plantworksModule.$utilities[`${utility.name}Async`] = promises.promisify(utility.method.bind(this.$plantworksModule));
			}

			return {
				'type': 'utilities',
				'status': Object.keys(this.$plantworksModule.$utilities).length ? Object.keys(this.$plantworksModule.$utilities) : null
			};
		}
		catch(err) {
			return {
				'type': 'utilities',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_loadUtilities error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _unloadUtilities
	 *
	 * @returns  {object} Object containing the unload status of each of the $plantworksModule utilities.
	 *
	 * @summary  Unload utilities defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _unloadUtilities() {
		try {
			const utilityNames = Object.keys(this.$plantworksModule.$utilities || {});
			utilityNames.forEach((utilityName) => {
				delete this.$plantworksModule.$utilities[utilityName];
				delete this.$plantworksModule.$utilities[`${utilityName}Async`];
			});

			delete this.$plantworksModule.$utilities;
			return {
				'type': 'utilities',
				'status': utilityNames.length ? utilityNames : null
			};
		}
		catch(err) {
			return {
				'type': 'utilities',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_unloadServices error`, err)
			};
		}
	}
	// #endregion

	// #region Services Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _loadServices
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} Object containing the load status of each of the $plantworksModule services.
	 *
	 * @summary  Load services defined as part of this {@link PlantWorksBaseModule}.
	 *
	 * @description
	 * Special processing:
	 * If the configSrvc parameter is undefined, load the {@link ConfigurationService} first, if any found.
	 *
	 * Since the {@link ConfigurationServiceLoader} calls load / initialize / start in one shot, the other sub-modules get, basically,
	 * a fully functional configuration service by the time they load, allowing them to use their configurations from the get-go.
	 */
	async _loadServices(configSrvc) {
		const path = require('path');

		try {
			if(!this.$plantworksModule.$services) this.$plantworksModule.$services = {};

			const definedServices = await this._findFiles(path.join(this.$plantworksModule.basePath, 'services'), 'service.js');

			let configSrvcLoadStatus = null,
				instConfigSrvc = null;

			if(!configSrvc) { // eslint-disable-line curly
				for(const definedService of definedServices) {
					const Service = require(definedService).service;
					if(!Service) continue;

					// Construct the Service...
					instConfigSrvc = new Service(this.$plantworksModule);
					instConfigSrvc.$dependants = [];

					if(instConfigSrvc.name !== 'ConfigurationService') {
						instConfigSrvc = undefined;
						continue;
					}

					// Check to see valid typeof
					// eslint-disable-next-line curly
					if(!(instConfigSrvc instanceof PlantWorksBaseService)) {
						throw new PlantWorksBaseError(`${definedService} does not contain a valid PlantWorksBaseService definition`);
					}

					configSrvcLoadStatus = await instConfigSrvc.load(null);
					break;
				}
			}

			for(const definedService of definedServices) {
				// Check validity of the definition...
				const Service = require(definedService).service;
				if(!Service) continue;

				// Construct the service
				const serviceInstance = new Service(this.$plantworksModule);
				serviceInstance.$dependants = [];

				if(serviceInstance.name === 'ConfigurationService')
					continue;

				// Check to see valid typeof
				// eslint-disable-next-line curly
				if(!(serviceInstance instanceof PlantWorksBaseService)) {
					throw new PlantWorksBaseError(`${definedService} does not contain a valid PlantWorksBaseService definition`);
				}

				this.$plantworksModule.$services[serviceInstance.name] = serviceInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('services', 'load', [configSrvc || instConfigSrvc]);

			if(instConfigSrvc) {
				this.$plantworksModule.$services['ConfigurationService'] = instConfigSrvc;
				nameStatusPairs['ConfigurationService'] = configSrvcLoadStatus;
			}

			return {
				'type': 'services',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_loadServices error`, err)

			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _initializeServices
	 *
	 * @returns  {object} Object containing the initialization status of each of the $plantworksModule services.
	 *
	 * @summary  Initialize Services defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _initializeServices() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('services', 'initialize');
			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_initializeServices error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _startServices
	 *
	 * @returns  {object} Object containing the start status of each of the $plantworksModule services.
	 *
	 * @summary  Start Services defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _startServices() {
		try {
			const DepGraph = require('dependency-graph').DepGraph;
			const initOrder = new DepGraph();

			const serviceNames = Object.keys(this.$plantworksModule.$services || {});
			serviceNames.forEach((serviceName) => {
				initOrder.addNode(serviceName);
			});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$plantworksModule.$services[serviceName];
				if(!thisService.dependencies.length) return;

				thisService.dependencies.forEach((thisServiceDependency) => {
					if(serviceNames.indexOf(thisServiceDependency) < 0) return;
					initOrder.addDependency(thisService.name, thisServiceDependency);
				});
			});

			const initOrderList = initOrder.overallOrder();

			const nameStatusPairs = {};
			for(const serviceName of initOrderList) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$plantworksModule.$services[serviceName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_startServices::${serviceName} error`, err);
				}

				nameStatusPairs[serviceName] = lifecycleStatus;
			}

			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			const error = new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_startServices error`, err);
			console.error(error.toString());
			throw error;
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _stopServices
	 *
	 * @returns  {object} Object containing the stop status of each of the $plantworksModule services.
	 *
	 * @summary  Stop Services defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _stopServices() {
		try {
			const DepGraph = require('dependency-graph').DepGraph;
			const uninitOrder = new DepGraph();

			const serviceNames = Object.keys(this.$plantworksModule.$services || {});
			serviceNames.forEach((serviceName) => {
				uninitOrder.addNode(serviceName);
			});

			serviceNames.forEach((serviceName) => {
				const thisService = this.$plantworksModule.$services[serviceName];
				if(!thisService.dependencies.length) return;

				thisService.dependencies.forEach((thisServiceDependency) => {
					if(serviceNames.indexOf(thisServiceDependency) < 0) return;
					uninitOrder.addDependency(thisService.name, thisServiceDependency);
				});
			});

			const uninitOrderList = uninitOrder.overallOrder().reverse();

			const nameStatusPairs = {};
			for(const serviceName of uninitOrderList) {
				let lifecycleStatus = null;
				try {
					lifecycleStatus = await this.$plantworksModule.$services[serviceName].stop();
				}
				catch(err) {
					lifecycleStatus = new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_stopServices error`, err);
				}

				nameStatusPairs[serviceName] = lifecycleStatus;
			}

			return {
				'type': 'services',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_stopServices error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _uninitializeServices
	 *
	 * @returns  {object} Object containing the uninit status of each of the $plantworksModule services.
	 *
	 * @summary  Uninitialize Services defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _uninitializeServices() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('services', 'uninitialize');
			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_uninitializeServices error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _unloadServices
	 *
	 * @returns  {object} Object containing the unload status of each of the $plantworksModule services.
	 *
	 * @summary  Unload Services defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _unloadServices() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('services', 'unload');
			return { 'type': 'services', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'services',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_uninitializeServices error`, err)
			};
		}
	}
	// #endregion

	// #region Middlewares Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _loadMiddlewares
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} Object containing the load status of each of the $plantworksModule middlewares.
	 *
	 * @summary  Load middlewares defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _loadMiddlewares(configSrvc) {
		const path = require('path');

		try {
			if(!this.$plantworksModule.$middlewares) this.$plantworksModule.$middlewares = {};

			const definedMiddlewares = await this._findFiles(path.join(this.$plantworksModule.basePath, 'middlewares'), 'middleware.js');
			for(const definedMiddleware of definedMiddlewares) {
				// Check validity of the definition...
				const Middleware = require(definedMiddleware).middleware;
				if(!Middleware) continue;

				// Construct the service
				const middlewareInstance = new Middleware(this.$plantworksModule);

				// Check to see valid typeof
				// if(!(middlewareInstance instanceof PlantWorksBaseMiddleware))
				// 	throw new PlantWorksBaseError(`${definedMiddleware} does not contain a valid PlantWorksBaseMiddleware definition`);

				this.$plantworksModule.$middlewares[middlewareInstance.name] = middlewareInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'load', [configSrvc]);
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_loadMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _initializeMiddlewares
	 *
	 * @returns  {object} Object containing the initialization status of each of the $plantworksModule middlewares.
	 *
	 * @summary  Initialize Middlewares defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _initializeMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'initialize');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlwares',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_initializeMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _startMiddlewares
	 *
	 * @returns  {object} Object containing the start status of each of the $plantworksModule middlewares.
	 *
	 * @summary  Start Middlewares defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _startMiddlewares() {
		try {
			const middlewareNames = Object.keys(this.$plantworksModule.$middlewares || {}),
				nameStatusPairs = {};

			for(const middlewareName of middlewareNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$plantworksModule.$middlewares[middlewareName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					lifecycleStatus = new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_doLifecycleAction (${middlewareName} / start) error`, err);
				}

				nameStatusPairs[middlewareName] = lifecycleStatus;
			}

			return {
				'type': 'middlewares',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'middlwares',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_startMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _stopMiddlewares
	 *
	 * @returns  {object} Object containing the stop status of each of the $plantworksModule middlewares.
	 *
	 * @summary  Stop Middlewares defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _stopMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'stop');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_stopMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _uninitializeMiddlewares
	 *
	 * @returns  {object} Object containing the uninit status of each of the $plantworksModule middlewares.
	 *
	 * @summary  Uninitialize Middlewares defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _uninitializeMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'uninitialize');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_uninitializeMiddlewares error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _unloadMiddlewares
	 *
	 * @returns  {object} Object containing the unload status of each of the $plantworksModule middlewares.
	 *
	 * @summary  Unload Middlewares defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _unloadMiddlewares() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('middlewares', 'unload');
			return { 'type': 'middlewares', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'middlewares',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_unloadMiddlewares error`, err)
			};
		}
	}
	// #endregion

	// #region Components Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _loadComponents
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} Object containing the load status of each of the $plantworksModule components.
	 *
	 * @summary  Load components defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _loadComponents(configSrvc) {
		const path = require('path');

		try {
			if(!this.$plantworksModule.$components) this.$plantworksModule.$components = {};

			const definedComponents = await this._findFiles(path.join(this.$plantworksModule.basePath, 'components'), 'component.js');
			for(const definedComponent of definedComponents) {
				// Check validity of the definition...
				const Component = require(definedComponent).component;
				if(!Component) continue;

				// Construct the service
				const componentInstance = new Component(this.$plantworksModule);

				// Check to see valid typeof
				// if(!(serviceInstance instanceof PlantWorksBaseService))
				// 	throw new PlantWorksBaseError(`${definedService} does not contain a valid PlantWorksBaseService definition`);

				this.$plantworksModule.$components[componentInstance.name] = componentInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('components', 'load', [configSrvc]);
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_loadComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _initializeComponents
	 *
	 * @returns  {object} Object containing the initialization status of each of the $plantworksModule components.
	 *
	 * @summary  Initialize Components defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _initializeComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'initialize');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_initializeComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _startComponents
	 *
	 * @returns  {object} Object containing the start status of each of the $plantworksModule components.
	 *
	 * @summary  Start Components defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _startComponents() {
		try {
			const componentNames = Object.keys(this.$plantworksModule.$components || {}),
				nameStatusPairs = {};

			for(const componentName of componentNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$plantworksModule.$components[componentName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					lifecycleStatus = new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_doLifecycleAction (${componentName} / start) error`, err);
				}

				nameStatusPairs[componentName] = lifecycleStatus;
			}

			return {
				'type': 'components',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_startComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _stopComponents
	 *
	 * @returns  {object} Object containing the stop status of each of the $plantworksModule components.
	 *
	 * @summary  Stop Components defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _stopComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'stop');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_stopComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _uninitializeComponents
	 *
	 * @returns  {object} Object containing the uninit status of each of the $plantworksModule components.
	 *
	 * @summary  Uninitialize Components defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _uninitializeComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'uninitialize');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_uninitializeComponents error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _unloadComponents
	 *
	 * @returns  {object} Object containing the unload status of each of the $plantworksModule components.
	 *
	 * @summary  Unload Components defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _unloadComponents() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('components', 'unload');
			return { 'type': 'components', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'components',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_unloadComponents error`, err)
			};
		}
	}
	// #endregion

	// #region Features Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _loadFeatures
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {object} Object containing the load status of each of the $plantworksModule features.
	 *
	 * @summary  Load features defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _loadFeatures(configSrvc) {
		const path = require('path');

		try {
			if(!this.$plantworksModule.$features) this.$plantworksModule.$features = {};

			const definedFeatures = await this._findFiles(path.join(this.$plantworksModule.basePath, 'features'), 'feature.js');
			for(const definedFeature of definedFeatures) {
				// Check validity of the definition...
				const Feature = require(definedFeature).feature;
				if(!Feature) continue;

				// Construct the service
				const featureInstance = new Feature(this.$plantworksModule);

				// Check to see valid typeof
				// if(!(serviceInstance instanceof PlantWorksBaseService))
				// 	throw new PlantWorksBaseError(`${definedService} does not contain a valid PlantWorksBaseService definition`);

				this.$plantworksModule.$features[featureInstance.name] = featureInstance;
			}

			const nameStatusPairs = await this._doLifecycleAction('features', 'load', [configSrvc]);
			return { 'type': 'features', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'features',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_loadFeatures error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _initializeFeatures
	 *
	 * @returns  {object} Object containing the initialization status of each of the $plantworksModule features.
	 *
	 * @summary  Initialize Features defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _initializeFeatures() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('features', 'initialize');
			return { 'type': 'features', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'features',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_initializeFeatures error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _startFeatures
	 *
	 * @returns  {object} Object containing the start status of each of the $plantworksModule features.
	 *
	 * @summary  Start Features defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _startFeatures() {
		try {
			const featureNames = Object.keys(this.$plantworksModule.$features || {}),
				nameStatusPairs = {};

			for(const featureName of featureNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = this.$plantworksModule.$features[featureName];
					const dependencies = this._getDependencies(moduleInstance);

					lifecycleStatus = await moduleInstance.start(dependencies);
				}
				catch(err) {
					lifecycleStatus = new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_doLifecycleAction (${featureName} / start) error`, err);
				}

				nameStatusPairs[featureName] = lifecycleStatus;
			}

			return {
				'type': 'features',
				'status': nameStatusPairs
			};
		}
		catch(err) {
			return {
				'type': 'features',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_startFeatures error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _stopFeatures
	 *
	 * @returns  {object} Object containing the stop status of each of the $plantworksModule features.
	 *
	 * @summary  Stop Features defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _stopFeatures() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('features', 'stop');
			return { 'type': 'features', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'features',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_stopFeatures error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _uninitializeFeatures
	 *
	 * @returns  {object} Object containing the uninit status of each of the $plantworksModule features.
	 *
	 * @summary  Uninitialize Features defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _uninitializeFeatures() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('features', 'uninitialize');
			return { 'type': 'features', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'features',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_uninitializeFeatures error`, err)
			};
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _unloadFeatures
	 *
	 * @returns  {object} Object containing the unload status of each of the $plantworksModule features.
	 *
	 * @summary  Unload Features defined as part of this {@link PlantWorksBaseModule}.
	 */
	async _unloadFeatures() {
		try {
			const nameStatusPairs = await this._doLifecycleAction('features', 'unload');
			return { 'type': 'features', 'status': nameStatusPairs };
		}
		catch(err) {
			return {
				'type': 'features',
				'status': new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_unloadFeatures error`, err)
			};
		}
	}
	// #endregion

	// #region Utilities
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _findFiles
	 *
	 * @param    {string} rootDir - Path of the folder to recursively search for.
	 * @param    {string} filename - Name of the file to search for.
	 *
	 * @returns  {Array} List of files in the folder matching the name passed in.
	 *
	 * @summary  Finds files in folders, and recursively, sub-folders, as well.
	 */
	async _findFiles(rootDir, filename) {
		try {
			const fs = require('fs'),
				path = require('path'),
				promises = require('bluebird');

			const filesystem = promises.promisifyAll(fs);
			let fileList = [];

			const exists = await this._exists(path.join(rootDir, filename));
			if(exists) {
				fileList.push(path.join(rootDir, filename));
				return fileList;
			}

			const rootDirObjects = await filesystem.readdirAsync(rootDir);
			if(!rootDirObjects) return null;

			const rootDirFolders = [];
			for(const rootDirObject of rootDirObjects) {
				const rootDirFolder = path.join(rootDir, rootDirObject);

				const stat = await filesystem.statAsync(rootDirFolder);
				if(!stat.isDirectory()) continue;

				rootDirFolders.push(rootDirFolder);
			}

			for(const rootDirFolder of rootDirFolders) {
				const subFolderFiles = await this._findFiles(rootDirFolder, filename);
				if(subFolderFiles) fileList = fileList.concat(subFolderFiles);
			}

			return fileList;
		}
		catch(err) {
			return [];
		}
	}

	/**
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _getDependencies
	 *
	 * @param    {PlantWorksBaseModule} moduleInstance - The module to find dependencies for.
	 *
	 * @returns  {object} The dependencies.
	 *
	 * @summary  Walks up the $plantworksModule.$parent chain, and at each level searches for a $service.
	 */
	_getDependencies(moduleInstance) {
		try {
			const moduleDependencies = {};
			let requiredDependencies = moduleInstance.dependencies.slice(0);

			if((requiredDependencies.length === 1) && (requiredDependencies[0] === '*')) {
				requiredDependencies.length = 0;

				let currentModule = this.$plantworksModule;
				while(!!currentModule) {
					requiredDependencies = requiredDependencies.concat(...currentModule.dependencies, ...Object.keys(currentModule.$services || {}));
					currentModule = currentModule.$parent;
				}

				const uniqueRequiredDependencies = new Set(requiredDependencies);
				requiredDependencies = [...uniqueRequiredDependencies];
			}

			const uniqueDependencies = [];
			requiredDependencies.forEach((thisDependency) => {
				if(thisDependency === '*')
					return;

				if(uniqueDependencies.indexOf(thisDependency) >= 0)
					return;

				uniqueDependencies.push(thisDependency);

				let currentDependency = null,
					currentModule = this.$plantworksModule;

				while(!!currentModule && !currentDependency) {
					currentDependency = currentModule.$services ? currentModule.$services[thisDependency] : null;
					if(!currentDependency) currentModule = currentModule.$parent;
				}

				if(!currentDependency) throw new Error(`${moduleInstance.name}::dependency::${thisDependency} not found!`);

				const interfaceMethod = function() {
					if(!this.$enabled) return null;
					return this.Interface ? this.Interface : this;
				}.bind(currentDependency);

				Object.defineProperty(moduleDependencies, thisDependency, {
					'__proto__': null,
					'configurable': true,
					'enumerable': true,
					'get': interfaceMethod
				});

				currentDependency.$dependants.push(moduleInstance);
			});

			return moduleDependencies;
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_getDependencies error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _doLifecycleAction
	 *
	 * @param    {string} moduleType - The type of the module to iterate over (services, components, etc.).
	 * @param    {string} action - The lifecycle action to execute (initialize, start, etc.).
	 * @param    {Array} args - The arguments to pass to the lifecycle method.
	 *
	 * @returns  {object} Hash map of the lifecycle status for each of the modules found.
	 *
	 * @summary  Executes a lifecycle action on the given hashmap.
	 */
	async _doLifecycleAction(moduleType, action, args) {
		try {
			args = args || [];

			const modules = this.$plantworksModule[`$${moduleType}`];
			const moduleNames = Object.keys(modules || {});

			const nameStatusPairs = {};
			for(const moduleName of moduleNames) {
				let lifecycleStatus = null;
				try {
					const moduleInstance = modules[moduleName];
					lifecycleStatus = await moduleInstance[action](...args);
				}
				catch(err) {
					lifecycleStatus = new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_doLifecycleAction (${moduleName} / ${action}) error`, err);
				}

				nameStatusPairs[moduleName] = lifecycleStatus;
			}

			return nameStatusPairs;
		}
		catch(err) {
			throw new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_doLifecycleAction (${moduleType} / ${action}) error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _exists
	 *
	 * @param    {string} filepath - Path of the filesystem entity.
	 * @param    {number} mode - Permission to be checked for.
	 *
	 * @returns  {boolean} True / False.
	 *
	 * @summary  Checks to see if the path can be accessed by this process using the mode specified.
	 */
	async _exists(filepath, mode) {
		const Promise = require('bluebird'),
			filesystem = require('fs');

		return new Promise((resolve, reject) => {
			try {
				filesystem.access(filepath, (mode || filesystem.constants.F_OK), (exists) => {
					resolve(!exists);
				});
			}
			catch(err) {
				const error = new PlantWorksBaseError(`${this.$plantworksModule.name}::loader::_exists error`, err);
				reject(error);
			}
		});
	}

	/**
	 * @function
	 * @instance
	 * @memberof PlantWorksModuleLoader
	 * @name     _filterStatus
	 *
	 * @param    {Array} status - The statuses to process and filter.
	 *
	 * @returns  {Array} The stringified statuses.
	 *
	 * @summary  Converts statuses to strings, depending on their type.
	 */
	_filterStatus(status) {
		try {
			const filteredStatus = status.map((thisStatus) => {
				if(thisStatus.status === null)
					return true;

				if(thisStatus.status instanceof Error)
					return thisStatus;

				// eslint-disable-next-line curly
				if(typeof thisStatus.status === 'object') {
					Object.keys(thisStatus.status).forEach((key) => {
						if(thisStatus.status[key] instanceof Error) {
							thisStatus.status[key] = (thisStatus.status[key] instanceof PlantWorksBaseError) ? thisStatus.status[key].toString() : thisStatus.status[key]['stack'];
							return;
						}

						if(Array.isArray(thisStatus.status[key])) {
							thisStatus.status[key] = this._filterStatus(thisStatus.status[key]);
							if(!thisStatus.status[key].length) thisStatus.status[key] = true;
						}
					});
				}

				return thisStatus;
			})
			.filter((thisStatus) => {
				if(!thisStatus) return false;
				if(!thisStatus.status) return false;

				if(!Object.keys(thisStatus.status).length)
					return false;

				return true;
			});

			return filteredStatus.length ? filteredStatus : true;
		}
		catch(err) {
			return [];
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

exports.PlantWorksModuleLoader = PlantWorksModuleLoader;
