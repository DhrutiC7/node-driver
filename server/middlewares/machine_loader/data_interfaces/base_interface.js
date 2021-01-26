/* eslint-disable security/detect-object-injection */

'use strict';

const EventEmitter = require('events');
const PlantWorksMiddlewareError = require('plantworks-middleware-error').PlantWorksMiddlewareError;

class BaseInterface extends EventEmitter {
	// #region Constructor
	constructor(machine) {
		super();
		this.$machine = machine;
	}

	// #region Public API
    async handleIncomingData(data) {
		try {
            // TODO
			return null;
		}
		catch(err) {
			throw new PlantWorksMiddlewareError(`${this.name}::_handleIncomingData error`, err);
		}
	}
	// #endregion
}

exports.Interface = BaseInterface;
