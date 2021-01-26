'use strict';

/**
 * Pre-flight stuff - to be done before the application class starts the server
 * @ignore
 */
require('app-module-path').addPath(`${__dirname}/../framework`);
require('dotenv').config();

/**
 * The name of the server - this is the name that is searched for in the database [modules.module_type = 'server' AND modules.name = ?]
 * @ignore
 */
const SERVER_NAME = process.env.SERVER_NAME || 'PlantWorksDriver';

/**
 * Setup global variables (ugh!) to make life simpler across the rest of the codebase
 * @ignore
 */
global.plantworksEnv = (process.env.NODE_ENV || 'development').toLocaleLowerCase();
process.title = 'plantworks-driver';

// Utility to allow non-blocking sleep in async/await mode without the ugly setTimeout
// appearing all over the place
global.snooze = async (ms) => {
    const Promise = require('bluebird');
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

/**
 * Module dependencies, required for this moduleOn process start, check to see if this process in the cluster is the master, or a slave.
 *
 * @ignore
 */
const PlantWorksApplication = require('./plantworks-application-class').PlantWorksApplication;
const PlantWorksBaseError = require('plantworks-base-error').PlantWorksBaseError;

/**
 * Let's instantiate the server object
 * @ignore
 */
const serverInstance = new PlantWorksApplication(SERVER_NAME);

/**
 * Mandatory error handlers, now that the server class has been instantiated.
 *
 * @ignore
 */
process.on('uncaughtException', (err) => {
    if (err instanceof PlantWorksBaseError)
        console.error(`Uncaught Exception: ${err.toString()}`);
    else
        console.error(`Uncaught Exception: ${err.message}\n${err.stack}`);

    process.exit(1); // eslint-disable-line no-process-exit
});

process.on('unhandledRejection', (reason, location) => {
    console.error(`Unhandled Rejection: ${reason} at:`, location);

    process.exit(1); // eslint-disable-line no-process-exit
});

/**
 * Finally, start the server - let's get going!
 * @ignore
 */
let shuttingDown = false;
const onDeath = require('death')({
    'uncaughtException': false,
    'debug': (plantworksEnv === 'development' || plantworksEnv === 'test')
});
const offDeath = onDeath(async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    const shutdownTime = process.hrtime();
    let shutDownErr = null;

    try {
        await serverInstance.shutdownServer();
    } catch (error) {
        shutDownErr = error;
    }

    const shutdownDuration = process.hrtime(shutdownTime);

    const convertHRTime = require('convert-hrtime');
    console.log(`${SERVER_NAME} stopped in: ${convertHRTime(shutdownDuration).milliseconds.toFixed(2)}ms`);

    offDeath();
    process.exit(!!shutDownErr); // eslint-disable-line no-process-exit
});

const startTime = process.hrtime();
let bootError = null;

serverInstance.bootupServer()
    .catch((bootupErr) => {
        bootError = bootupErr;
        shuttingDown = true;

        return serverInstance.shutdownServer();
    })
    .finally(() => {
        const startDuration = process.hrtime(startTime);

        const convertHRTime = require('convert-hrtime');
        console.log(`${SERVER_NAME} started in: ${convertHRTime(startDuration).milliseconds.toFixed(2)}ms`);

        if (!bootError) return;

        offDeath();
        process.exit(1); // eslint-disable-line no-process-exit
    });