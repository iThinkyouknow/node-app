// gather up all the checks

const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const util = require('util');
const debug = util.debuglog('workers');


const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');
const {isPresentType} = require('../functions');

const isArray = isPresentType('array');
const isObject = isPresentType('object');
const isString = isPresentType('string');
const isNumber = isPresentType('number');

const {log} = console;

//process the check outcome, update check data as needed, trigger an alert to user if needed
// special logic that accomodates for checks that has never been tested before (don't alert on that one);
const alertUserToStatusChange = (newCheckData) => {
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    helpers.sendTwilioSms(newCheckData.userPhone, msg,  (err) => {
        if (!err) {
            debug(`Success: User was alert to ${msg}`);
        } else {
            debug(`Error could not send sms alert to user`);
        }
    });
};

const wlog = (check, outcome, state, alert, time) => {
    const logData = {check, outcome, state, alert, time};
    const logString = JSON.stringify(logData);
    const logFileName = check.id;
    
    _logs.append(logFileName, logString, (err) => {
        if (!err) {
            debug('Logging to file succeeded');
        } else {
            debug('Logging failed with err: ${err}');
        }
    });
};


const processCheckOutcome = (originalCheckData, checkOutcome) => {
    const state = (!checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1)
        ? 'up'
        : 'down';

    const alertWarranted = (originalCheckData.lastChecked && originalCheckData.state !== state)

    // update the check data
    const lastChecked = Date.now();
    const newCheckData = {
        ...originalCheckData
        , state
        , lastChecked
    };

    // log the outcome
    wlog(originalCheckData, checkOutcome, state, alertWarranted, lastChecked);

    _data.update('checks', newCheckData.id, newCheckData, (err) => {
        if (!err) {
            if (alertWarranted === true) {
                alertUserToStatusChange(newCheckData);
            } else {
                debug(`Check ${newCheckData.id} outcome has not changed, no alert needed`);
            }
        } else {
            debug('Error trying to save updates to one of the checks');
        }
    });

};

const performCheck = (originalCheckData) => {
    const checkOutcome = {
        error: false
        , responseCode: false
    }

    let outcomeSent = false;

    const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // path & not pathname because we want the entire query string

    const requestDetails = {
        protocol: `${originalCheckData.protocol}:`
        , hostname: hostName
        , method: originalCheckData.method.toUpperCase()
        , path: path
        , timeout: originalCheckData.timeoutSeconds * 1000
    };


    const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) => {
        // grab the request of the sent request

        const status = res.status;

        if (!outcomeSent === true) {
            const newCheckOutcome = {
                ...checkOutcome
                , responseCode: status
            };

            processCheckOutcome(originalCheckData, newCheckOutcome);
            
            outcomeSent = true;
        }
    });

    req.on('error', (e) => {
        if (!outcomeSent === true) {
            const newCheckOutcome = {
                ...checkOutcome
                , error: {
                    error: true
                    , value: e
                }
            };

            processCheckOutcome(originalCheckData, newCheckOutcome);
            outcomeSent = true
        }
    });

    req.on('timeout', (e) => {
        if (!outcomeSent === true) {
            const newCheckOutcome = {
                ...checkOutcome
                , error: {
                    error: true
                    , value: 'timeout'
                }
            };
            
            processCheckOutcome(originalCheckData, newCheckOutcome);
            outcomeSent = true
        }
    });


    req.end();
};

const validateCheckData = (_originalCheckData) => {
    const originalCheckData = isObject(_originalCheckData) ? _originalCheckData : {};
    const id = isString(originalCheckData.id) && originalCheckData.id.trim().length === 20 
        ? originalCheckData.id.trim()
        : ''

    const userPhone = isString(originalCheckData.userPhone) && originalCheckData.userPhone.trim().length === 10 
        ? originalCheckData.userPhone.trim()
        : ''

    const acceptableProtocols = {
        http: 'http'
        , https: 'https'
    };

    const protocol = isString(originalCheckData.protocol) && isString(acceptableProtocols[originalCheckData.protocol])
        ? originalCheckData.protocol
        : '';

    const url = isString(originalCheckData.url) && isString(originalCheckData.url.trim())
        ? originalCheckData.url.trim()
        : '';

    const acceptableMethods = {
        post: 'post'
        , get: 'get'
        , put: 'put'
        , delete: 'delete'
    };

    const method = isString(originalCheckData.method) && isString(acceptableMethods[originalCheckData.method])
        ? originalCheckData.method
        : ''

    const successCodes = isArray(originalCheckData.successCodes)
        ? originalCheckData.successCodes
        : [];

    const timeoutSeconds = isNumber(originalCheckData.timeoutSeconds) && originalCheckData.timeoutSeconds > 0 && originalCheckData.timeoutSeconds < 6 
        ? originalCheckData.timeoutSeconds
        : ''

    const acceptableStates = {
            up: 'up'
            , down: 'down'
        };
    
    const state = isString(originalCheckData.state) && isString(acceptableStates[originalCheckData.state])
            ? originalCheckData.state
            : 'down';

    const lastChecked = isNumber(originalCheckData.lastChecked) && originalCheckData.lastChecked > 0
        ? originalCheckData.lastChecked
        : NaN

    if (isString(id) && isString(userPhone) && isString(protocol) 
        && isString(url) && isString(method) && isArray(successCodes) 
        && isNumber(timeoutSeconds)) {
            performCheck(originalCheckData);

    } else {
        debug('Error: One of the checks is not properly formatted');
    } 
};

const gatherAllChecks = () => {
    // get all the checks
    _data.list('checks', (err, checks) => {
        if (!err && isArray(checks)) {
            checks.forEach((check) => {
                _data.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        // pass it to the check validator
                        validateCheckData(originalCheckData);
                    } else {
                        debug("Error reading one of the checks");
                    }
                });
            });
        } else {
            debug(`Error: could not find any checks to process`)
        }
    })
};

const loop = () => {
    setInterval(gatherAllChecks, 1000 * 60);
};

const rotateLogs = () => {
    // list all non compressed log files
    _logs.list(false, (err, logs) => {
        if (!err && isArray(logs)) {
            logs.forEach((logName) => {
                const logId = logName.replace('.log', '');
                const newFileId = `${logId}-${Date.now()}`;
                
                _logs.compress(logId, newFileId, (err) => {
                    if (!err) {
                        // truncate the log
                        _logs.truncate(logId, (err) => {
                            if (!err) {
                                debug('Success Truncating');
                            } else {
                                debug(`Error truncating with error: ${err}`);
                            }

                        });
                    } else {
                        debug(`Error compressing log files with Error: ${err}`);
                    }
                });
            });
            

        } else {
            debug('Error: could not find any logs to rotate');
        }
    });
};

const logRotateLoop = () => {
    setInterval(rotateLogs, 1000 * 60 * 60 * 24);
};

//paused here: 10:44
const workers = {
    init: () => {
        console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
        gatherAllChecks();
        loop();
        rotateLogs();
        logRotateLoop();
    }
    , gatherAllChecks
    , loop
    , validateCheckData
    , performCheck
    , processCheckOutcome
    , alertUserToStatusChange
};

module.exports = workers;