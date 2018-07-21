//library for storing and rotating logs

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const {
    isPresentType
    , isArray
    , isBoolean
    , isFunction
    , isNumber
    , isObject
    , isString
} = require('../functions');

// container for the module

const baseDir = path.join(__dirname, '/../.logs/');

const append = (file, str, callback) => {
    fs.open(`${baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, `${str}\n`, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback(`Error closing file that was being appended`);
                        }
                    })
                } else {
                    callback('Error appending to file');
                }
            });

        } else {
            callback('Could not open file for appending');
        }
    });
};

// list all logs, optionally include compressed logs

const list = (includeCompressedLogs, callback) => {
    fs.readdir(baseDir, (err, data) => {
        if (!err && isArray(data)) {
            const trimmedFileNames = data
            .filter(file => /\.log$/i.test(file) || (/\.gz\.b64$/i.test(file) && includeCompressedLogs === true))
            .map(file => file.replace(/\.log|\.gz\.b64/i, ''));
            callback(false, trimmedFileNames);
        } else {
            callback(`Error reading dir: ${err}`);
        }
    });
};

const compress = (logId, newFileId, callback) => {

    const sourceFile = `${logId}.log`;
    const destFile = `${newFileId}.gz.b64`;

    fs.readFile(`${baseDir}${sourceFile}`, 'utf8', (err, inputString) => {
        if (!err && inputString) {
            zlib.gzip(inputString, (err, buffer) => {
                if (!err && buffer) {
                    fs.open(`${baseDir}${destFile}`, 'wx', (err, fileDescriptor) => {
                        if (!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                                if (!err) {
                                    fs.close(fileDescriptor, (err) => {
                                        if (!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        }
                    });
                }
            });
        } else {
            callback(err);
        }
    })
};

const decompress = (fileId, callback) => {
    const fileName = `${fileId}.gz.b64`;
    fs.readFile(`${baseDir}${fileName}`, 'utf8', (err, str) => {
        if (!err && str) {
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) => {
                if (!err && outputBuffer) {
                    console.log(typeof outputBuffer);

                    const str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

const truncate = (logId, callback) => {
    fs.truncate(`${baseDir}${logId}.log`, '0', (err) => {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });

};

const lib = {
    baseDir
    , append
    , list
    , compress
    , decompress
    , truncate
};

module.exports = lib;