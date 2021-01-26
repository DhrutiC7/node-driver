/* eslint-disable security/detect-object-injection */

'use strict';

const moment = require('moment');
const BaseInterface = require('./base_interface').Interface;
const PlantWorksMiddlewareError = require('plantworks-middleware-error').PlantWorksMiddlewareError;

class ModbusDataInterface extends BaseInterface {
	// #region Constructor
	constructor(machine) {
        super(machine);
		this.$slave = machine;
		this.$aggregatedUploadData = {};

		// control registers and common parameters
		this.$controlRegisters = machine.controlRegisters;
		this.$commonParameters = machine.commonParameters;
		
		this.$c1Parameters = machine.c1Parameters;				// Discuss: weighers parameters only
		this.$c2Parameters = machine.c2Parameters;				// Discuss: weighers parameters only

		// incoming data event listener
		this.on('incoming-data', this.handleIncomingData.bind(this.$aggregatedUploadData));
	}
	
	// #region Public API
    async startup() {
		const ModbusRTU = require('modbus-serial');
		const shutdownFn = this.shutdown.bind(this);

		this.$modbusClient = new ModbusRTU();
		this.$modbusClient.setTimeout(2000);

		this.$modbusClient.on('error', shutdownFn);
		this.$modbusClient.once('error', (err) => {
			shutdownFn(err);
		});

		try {
			await this.$modbusClient.connectTCP(this.$slave.options.host, this.$slave.options);
			this.$dependencies.LoggerService.debug(`Connected to MODBUS Slave @ ${this.$slave.options.protocol}://${this.$slave.options.host}:${this.$slave.options.port}`);

			this.$modbusClient.setID(this.$slave.options.unitId);
			setImmediate(this._dataFetch.bind(this));
		}
		catch(err) {
			this.shutdown(err);
			setTimeout(this.startup.bind(this), 60000);
		}
	}

    async shutdown(error) {
		if(error) {
			console.error(`Modbus Error::Machine: ${this.$slave.options.protocol}://${this.$slave.options.host}:${this.$slave.options.port}\nMessage: ${error.message}\nStack:\n${error.stack}`);
		}

		this.removeAllListeners();
		if(!this.$modbusClient) return;

		this.$modbusClient.removeAllListeners();
		this.$modbusClient.close();

		this.$modbusClient = null;
	}
	// #endregion

	// #region Private Methods
	async _dataFetch() {
		const convertHRTime = require('convert-hrtime');
		

		// Note when we started data fetch
		console.log(`Starting data fetch from @ ${this.$slave.options.protocol}://${this.$slave.options.host}:${this.$slave.options.port}`);
		const loopStartTime = process.hrtime();

		let dataFetchError = null;
		try {
			// Object to hold machine data...
			let aggregateUploadData = {};

			// Step 1: Get common parameters...
			const commonParameterData = await this._getData(this.$commonParameters);
			aggregateUploadData = Object.assign({}, aggregateUploadData, commonParameterData);


			// Step 2: Get the control registers...
			let controlData = await this._getData(this.$controlRegisters);

			/*
			// Step 3: Ensure holding & input channels are the same
			await this._writeData(controlData['HOLDING_INDICATOR']);
			controlData = await this._getData(this.$controlRegisters);
			*/

			const initialControlData = JSON.parse(safeJsonStringify(controlData));
			// Step 3: Get the first channel parameters
			if(controlData['HOLDING_INDICATOR'] === 0) {
				const channelData = await this._getData({
					'holdingRegisters': this.$c1Parameters.holdingRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}
			else {
				const channelData = await this._getData({
					'holdingRegisters': this.$c2Parameters.holdingRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}

			if(controlData['INPUT_INDICATOR'] === 0) {
				const channelData = await this._getData({
					'inputRegisters': this.$c1Parameters.inputRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}
			else {
				const channelData = await this._getData({
					'inputRegisters': this.$c2Parameters.inputRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}

			// Step 4: Change the channel
			controlData['HOLDING_INDICATOR'] = !controlData['HOLDING_INDICATOR'];
			controlData['INPUT_INDICATOR'] = !controlData['INPUT_INDICATOR'];

			await this._writeData([controlData['HOLDING_INDICATOR'], controlData['INPUT_INDICATOR']]);
			controlData = await this._getData(this.$controlRegisters);

			// Step 5: Get the second channel parameters
			if(controlData['HOLDING_INDICATOR'] === 0) {
				const channelData = await this._getData({
					'holdingRegisters': this.$c1Parameters.holdingRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}
			else {
				const channelData = await this._getData({
					'holdingRegisters': this.$c2Parameters.holdingRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}

			if(controlData['INPUT_INDICATOR'] === 0) {
				const channelData = await this._getData({
					'inputRegisters': this.$c1Parameters.inputRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}
			else {
				const channelData = await this._getData({
					'inputRegisters': this.$c2Parameters.inputRegisters
				});
				aggregateUploadData = Object.assign({}, aggregateUploadData, channelData);
			}

			// Step 6: Change the channel back to the initial channel
			let controlsChanged = false;
			Object.keys(initialControlData).forEach((key) => {
				if(controlData[key] !== initialControlData[key])
					controlsChanged = true;

				controlData[key] = initialControlData[key]
			});

			if(controlsChanged)
				await this._writeData([controlData['HOLDING_INDICATOR'], controlData['INPUT_INDICATOR']]);

			// Finally, enter the reserved parameters and push it to the aggregator
			aggregateUploadData[`CONNECTION_OK`] = 1;
			aggregateUploadData['ERN_RSV_CLIENT_TIMESTAMP'] = moment().valueOf();

			this.$aggregatedUploadData = aggregateUploadData;
			this.emit('incoming-data');
			
			// TODO: FOR LOG PURPOSES ONLY. DELETE ONCE DEVELOPMENT IS DONE.
			const uploadString = Object.keys(aggregateUploadData).map((key) => {
				return `${key}:${aggregateUploadData[key]}`
			})
			.join(',');

			console.log(`Finished data fetch from @ ${this.$slave.options.protocol}://${this.$slave.options.host}:${this.$slave.options.port} in ${convertHRTime(process.hrtime(loopStartTime)).seconds} seconds:\n${uploadString}`);
			// TODO: FOR LOG PURPOSES ONLY. DELETE ONCE DEVELOPMENT IS DONE.
		}
		catch(err) {
			console.error(`Error in data fetch from @ ${this.$slave.options.protocol}://${this.$slave.options.host}:${this.$slave.options.port}`, err);
			dataFetchError = err;
		}

		// Re-connect 60 seconds after we started the data fetch for this round...
		const loopDuration = 60000 - convertHRTime(process.hrtime(loopStartTime)).milliseconds;
		const pauseDuration = (loopDuration > 0) ? loopDuration : 60000;

		// Disconnect for now, and setup connection for later
		setTimeout(this.startup.bind(this), pauseDuration);

		if(dataFetchError)
			this.shutdown(dataFetchError);
		else
			this.shutdown();
	}

	async _getData(parameterList) {
		const promises = require('bluebird');
		const promiseResolutions = [];

		if(parameterList.coils)
		parameterList.coils.forEach((coilRegister) => {
			promiseResolutions.push(this.$modbusClient.readCoils(coilRegister.register - 1, coilRegister.length));
		});

		if(parameterList.discreteInputs)
		parameterList.discreteInputs.forEach((discreteInputRegister) => {
			promiseResolutions.push(this.$modbusClient.readDiscreteInputs(discreteInputRegister.register - 1, discreteInputRegister.length));
		});

		if(parameterList.holdingRegisters)
		parameterList.holdingRegisters.forEach((holdingRegister) => {
			promiseResolutions.push(this.$modbusClient.readHoldingRegisters(holdingRegister.register - 1, holdingRegister.length));
		});

		if(parameterList.inputRegisters)
		parameterList.inputRegisters.forEach((inputRegister) => {
			promiseResolutions.push(this.$modbusClient.readInputRegisters(inputRegister.register - 1, inputRegister.length));
		});

		let values = await promises.all(promiseResolutions);

		const returnValues = {};

		if(parameterList.coils)
		parameterList.coils.forEach((register) => {
			if(register.length === 1) {
				returnValues[register.key] = (Number(values.shift()['data'][0]) * register.scale);
			}
			else {
				const currBuffer = [];
				const registerValue = values.shift();

				for(let idx = 0; idx < register.length; idx++)
					currBuffer.push(registerValue['data'][idx]);

				returnValues[register.key] = (((Number(currBuffer[0]) * 65536) + Number(currBuffer[1])) * register.scale);
			}
		});

		if(parameterList.discreteInputs)
		parameterList.discreteInputs.forEach((register) => {
			if(register.length === 1) {
				returnValues[register.key] = (Number(values.shift()['data'][0]) * register.scale);
			}
			else {
				const currBuffer = [];
				const registerValue = values.shift();

				for(let idx = 0; idx < register.length; idx++)
					currBuffer.push(registerValue['data'][idx]);

				returnValues[register.key] = (((Number(currBuffer[0]) * 65536) + Number(currBuffer[1])) * register.scale);
			}
		});

		if(parameterList.holdingRegisters)
		parameterList.holdingRegisters.forEach((register) => {
			if(register.length === 1) {
				returnValues[register.key] = (Number(values.shift()['data'][0]) * register.scale);
			}
			else {
				const currBuffer = [];
				const registerValue = values.shift();

				for(let idx = 0; idx < register.length; idx++)
					currBuffer.push(registerValue['data'][idx]);

				returnValues[register.key] = (((Number(currBuffer[0]) * 65536) + Number(currBuffer[1])) * register.scale);
			}
		});

		if(parameterList.inputRegisters)
		parameterList.inputRegisters.forEach((register) => {
			if(register.length === 1) {
				returnValues[register.key] = (Number(values.shift()['data'][0]) * register.scale);
			}
			else {
				const currBuffer = [];
				const registerValue = values.shift();

				for(let idx = 0; idx < register.length; idx++)
					currBuffer.push(registerValue['data'][idx]);

				returnValues[register.key] = (((Number(currBuffer[0]) * 65536) + Number(currBuffer[1])) * register.scale);
			}
		});

		return returnValues;
	}

	async _writeData(values) {
		const promises = require('bluebird');
		const promiseResolutions = [];

		if(this.$controlRegisters.holdingRegisters)
		this.$controlRegisters.holdingRegisters.forEach((register, idx) => {
			promiseResolutions.push(this.$modbusClient.writeRegister(register.register - 1, values[idx]));
		});

		await promises.all(promiseResolutions);
		await snooze(1000);

		return;
	}
	// #endregion
}

exports.Interface = ModbusDataInterface;
