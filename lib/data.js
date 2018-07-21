// storing and editing data
const fs = require('fs');
const path = require('path');
const {isPresentType} = require('../functions');
const {parseJsonToObject} = require('./helpers');

const isArray = isPresentType('array');

const baseDir = path.join(__dirname, '/../.data/');

const libCreate = (dir, file, data, callback) => {

    fs.open(`${baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);
            
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    });
                    
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('Could not create new file, it may already exist');
        }
    });
};

const libRead = (dir, file, callback) => {
    fs.readFile(`${baseDir}${dir}/${file}.json`, 'utf8', (err, data) => {
        if (!err && isPresentType('string')(data)) {
            const parsedData = parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
        
    })
};

const libUpdate = (dir, file, data, callback) => {
    fs.open(`${baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);
            fs.truncate(fileDescriptor, (err) => {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                }
                            });
                        } else {
                            callback(`Error closing existing file`);
                        }
                    });
                }
            });
        } else {
            callback('Could not update file, it may not exist');
        }
    });
};

const libDelete = (dir, file, callback) => {
    // unlink
    fs.unlink(`${baseDir}${dir}/${file}.json`, (err) => {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting file');
        }
    });
};

const libList = (dir, callback) => {
    fs.readdir(`${baseDir}${dir}/`, (err, data) => {
        if (!err && isArray(data)) {
            const trimmedFileNames = data.map((fileName) => fileName.replace('.json', ''));
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};

const lib = {
    baseDir
    , create: libCreate
    , read: libRead
    , update: libUpdate
    , delete: libDelete
    , list: libList
};

module.exports = lib;