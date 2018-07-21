const readline = require('readline');
const util = require('util');
const events = require('events');
const os = require('os');
const v8 = require('v8');

const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');

const {
    isArray
    , isBoolean
    , isFunction
    , isNumber
    , isObject
    , isString
} = require('../functions')

const debug = util.debuglog('cli');

class _events extends events { };

const e = new _events();

const horizontalLine = () => {
    // Get available screen size
    const width = process.stdout.columns;

    let line = '';
    for (let i = 0; i < width; i++) {
        line += '-';
    }

    console.log(line);

};

const centered = (_str) => {
    const str = isString(_str) ? _str.trim() : '';
    const width = process.stdout.columns;
    const leftPadding = Math.floor((width - str.length) / 2);

    let line = '';

    for (let i = 0; i < leftPadding; i++) {
        line += ' ';
    }

    line += str;

    console.log(line);


}

const verticalSpace = _lines => {
    const lines = (isNumber(_lines) && _lines) > 0 ? _lines : 1;
    for (let i = 0; i < lines; i++) {
        console.log('');
    }
};

// responders
const help = () => {
    console.log('You asked for help');
    const commands = {
        exit: 'Kill the CLI (and the rest of the application)'
        , man: 'Show this help page'
        , help: 'Alias for "man"'
        , stats: 'Get statistics on the underlying operating system and resource utils'
        , 'list users': 'Show a list of all the registered (undeleted users in the system)'
        , 'more user info --{userId}': 'show details of specific user'
        , 'list checks --up --down': 'show list of active checks, --up --down optional'
        , 'more check info --{checkId}': 'show details of specified check'
        , 'list logs': 'show a list of log files available to be read'
        , 'more log info --{fiileName}': 'Show details of a specified log file'
    };

    horizontalLine();
    centered('CLI Manual');
    horizontalLine();
    verticalSpace(2);

    for (let key in commands) {
        if (commands.hasOwnProperty(key)) {
            const value = commands[key];
            let line = `\x1b[33m${key}\x1b[0m`;
            const padding = 60 - line.length;

            for (let i = 0; i < padding; i++) {
                line += ' ';

            }
            line += value;
            console.log(line);
            verticalSpace();

        }
    }

    verticalSpace(1);

    // end with horizontal line
    horizontalLine();


};


const exit = () => {
    process.exit(0);
};

const stats = () => {
    console.log('You asked for stats');
    const stats = {
        'Load Average': os.loadavg().join(' ')
        , 'CPU Count': os.cpus.length
        , 'Free Memory': os.freemem()
        , 'Current Malloced Memory': v8.getHeapStatistics().malloced_memory
        , 'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory
        , 'Allocated Heap Used (%)': Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100)
        , 'Available Heap allocated (%)': Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100)
        , 'Uptime': `${os.uptime()} seconds`
    };

    horizontalLine();
    centered('SYSTEM STATISTICS');
    horizontalLine();
    verticalSpace(2);

    for (let key in stats) {
        if (stats.hasOwnProperty(key)) {
            const value = stats[key];
            let line = `\x1b[33m${key}\x1b[0m`;
            const padding = 60 - line.length;

            for (let i = 0; i < padding; i++) {
                line += ' ';

            }
            line += value;
            console.log(line);
            verticalSpace();

        }
    }

    verticalSpace(1);

    // end with horizontal line
    horizontalLine();
};

const listUsers = () => {
    console.log('You asked for listUsers');
    _data.list('users', (err, userIds) => {
        if (!err && isArray(userIds)) {
            verticalSpace();
            userIds.forEach((userId) => {
                _data.read('users', userId, (err, userData) => {
                    if (!err && userData) {
                        
                        let numberOfChecks = isArray(userData.checks) ? userData.checks.length : 0;
                        let line = `Name: ${userData.firstName} ${userData.lastName} Phone: ${userData.phone} checks: ${numberOfChecks}`;
                        console.log(line);
                        verticalSpace();
                    }
                });
            });
        }
    })
};

const moreUserInfo = (str) => {
    // Get the ID from the string
    const arr = str.split('--');
    const userId = isString(arr[1]) ? arr[1] : '';
    if (isString(userId)) {
        _data.read('users', userId, (err, userData) => {
            if (!err && userData) {
                // remove the hashed password
                delete userData.hashedPassword;
                verticalSpace();
                console.dir(userData, {colors: true});
                verticalSpace();

            }
        });
    }
};

const listChecks = (str) => {
    console.log('You asked for listChecks', str);
    _data.list('checks', (err, checkIds) => {
        if (!err && isArray(checkIds)) {
            verticalSpace();
            checkIds.forEach((checkId) => {
                _data.read('checks', checkId, (err, checkData) => {
                    let includeCheck = false;
                    const lowerString = str.toLowerCase();
                    const state = isString(checkData.state) ? checkData.state : 'down';
                    // get state default to unknown
                    const stateOrUnknown = isString(checkData.state) ? checkData.state : 'unknown';

                    // if user has specified, handle
                    if (lowerString.indexOf(`--${state}`) > -1 || lowerString.indexOf('--down') === -1 && lowerString.indexOf('--up') === -1 ) {
                        let line = `ID: ${checkData.id} ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} State: ${stateOrUnknown}`;
                        console.log(line);
                        verticalSpace();
                    }

                });
            });
        }
    });
};

const moreCheckInfo = (str) => {

    const arr = str.split('--');
    const checkId = isString(arr[1]) ? arr[1] : '';
    if (isString(checkId)) {
        _data.read('checks', checkId, (err, checkData) => {
            if (!err && checkData) {
            
                verticalSpace();
                console.dir(checkData, {colors: true});
                verticalSpace();

            }
        });
    }
};

const listLogs = () => {
    console.log('You asked for listLogs');
    _logs.list(true, (err, logFileNames) => {
        if (!err && isArray(logFileNames)) {
            verticalSpace();
            logFileNames.forEach((logFileName) => {
                if (logFileName.indexOf('-') > -1) {
                    console.log(logFileName);
                    verticalSpace();
                }
            });
        }
    });
};

const moreLogInfo = (str) => {
    console.log('You asked for moreLogInfo', str);
    const arr = str.split('--');
    const logFileName = isString(arr[1]) ? arr[1] : '';
    if (isString(logFileName)) {
        verticalSpace();
        _logs.decompress(logFileName, (err, strData) => {
            if (!err && isString(strData)) {
                const arr = strData.split('\n');
                arr.forEach((jsonString) => {
                    const logObject = helpers.parseJsonToObject(jsonString);
                    if (logObject && JSON.stringify(logObject) !== '{}') {
                        console.dir(logObject, {colors: true});
                        verticalSpace();
                    }
                });
            }
        });
    }
};


// input handlers

e.on('man', (str) => help());

e.on('help', (str) => help());
e.on('exit', (str) => exit());
e.on('stats', (str) => stats());
e.on('list users', (str) => listUsers());
e.on('more user info', (str) => moreUserInfo(str));
e.on('list checks', (str) => listChecks(str));
e.on('more check info', (str) => moreCheckInfo(str));
e.on('list logs', (str) => listLogs());
e.on('more log info', (str) => moreLogInfo(str));



// responders



const responders = {
    help
};



// input processor
const processInput = (_str) => {
    const str = isString(_str) ? _str : '';
    if (isString(str)) {
        // codify the unique strings that identify the unique questions allowed to be asked
        const uniqueInputs =
        {
            man: 'man'
            , help: 'help'
            , exit: 'exit'
            , stats: 'stats'
            , 'list users': 'list users'
            , 'more user info': 'more user info'
            , 'list checks': 'list checks'
            , 'more check info': 'more check info'
            , 'list logs': 'list logs'
            , 'more log info': 'more log info'
        };

        const uniqueInputsArray = Object.keys(uniqueInputs);

        let matchFound = false;
        let counter = 0;

        uniqueInputsArray.some((input) => {
            if (str.toLowerCase().indexOf(input) > -1) {
                matchFound = true;

                //emit the event matching the unique input and include the full string
                e.emit(input, str);
                return true;
            }
        });

        if (!matchFound) {
            console.log("sorry try again");
        }


    }
};

const init = () => {
    console.log('\x1b[34m%s\x1b[0m', `The CLI is running`);
    // start the interface
    const _interface = readline.createInterface({
        input: process.stdin
        , output: process.stdout
        , prompt: '>'
    });

    // create the initial prompt
    _interface.prompt();

    // handle each line of input separately
    _interface.on('line', (str) => {
        processInput(str);

        // reinitialize the prompt
        _interface.prompt();

    });

    _interface.on('close', () => process.exit(0));


};



const cli = {
    init
    , processInput
};

module.exports = cli;