// helpers for various tasks
const crypto  = require('crypto');
const querystring = require('querystring');
const https = require('https');
const path = require('path');
const fs = require('fs');

const config = require('./config')
const {isPresentType, isString, isObject} = require('../functions');


//SHA 256 hash
const get_hash = (str) => {
    if (!isPresentType(str)) return str;
    const hash = crypto.createHmac('sha256', config.hashingSecret)
        .update(str)
        .digest('hex');

    return hash;

};

const parseJsonToObject = (str) => {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch(e) {
        return {}
    }
};

const getNewRandomChar = (random) => (possibleCharacters) => () => possibleCharacters.charAt(Math.floor(random() * possibleCharacters.length));
const getNewRandomCharWRandom = getNewRandomChar(Math.random);

const generateRandomString = (getNewRandomCharLoaded) => (charsRemaining) => (returnString) => {
    return (charsRemaining === 0) 
        ? returnString
        : generateRandomString(getNewRandomCharLoaded)(charsRemaining - 1)(returnString + getNewRandomCharLoaded());
};

const createRandomString = (strLength) => {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return isPresentType('number')(strLength) && strLength > 0
        ? generateRandomString(getNewRandomCharWRandom(possibleCharacters))(strLength)('')
        : false;
};

const sendTwilioSms = (_phone, _msg, callback) => {
    const trimmedMsg = isString(_msg) ? _msg.trim() : '';
    const phone = isString(_phone) && _phone.trim().length === 10 ? _phone.trim() : '';
    const msg =  (trimmedMsg.length > 0 && trimmedMsg.length < 1601) ? trimmedMsg : '';

    if (isString(phone) && isString(msg)) {
        //configure the request payload
        const payload = {
            From: config.twilio.fromPhone
            , To: `+1${phone}`
            , Body: msg
        };
        const stringPayload = querystring.stringify(payload);

        const requestDetails = {
            protocol: 'https:'
            , hostname: 'api.twilio.com'
            , method: 'POST'
            , path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`
            , auth: `${config.twilio.accountSid}:${config.twilio.authToken}`
            , headers: {
                'Content-Type': `application/x-www-form-urlencoded`
                , 'Content-Length': Buffer.byteLength(stringPayload)
            }
        };
        // instantiate the request object

        const req = https.request(requestDetails, (res) => {
            const status = res.statusCode;
            if (status === 200 || status === 201) {
                callback(false);
            } else {
                callback(`Status code returned as ${status}`);
            }
        });

        req.on('error', (e) => callback(e));

        req.write(stringPayload);

        req.end();



    } else {
        callback('Given parameters were missing or incorrect');
    }
};


const interpolate = (_str, _data) => {
    const str = isString(_str) ? _str : '';
    const data = isObject(_data) ? _data : {};

    for (let keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data[`global.${keyName}`] = config.templateGlobals[keyName];
        }
    }

    let newString = str;
    for (let key in data) {
        
        
        if (data.hasOwnProperty(key) && isString(data[key])) {
            const replace = data[key];
            
            const find = `{${key}}`;
            
            newString = newString.replace(find, replace);
            
        }
    }
    

    return newString
};








const getTemplate = (_templateName, data, callback) => {
    const templateName = isString(_templateName) ? _templateName : '';
    if (isString(templateName)) {
        const templatesDir = path.join(__dirname, `/../templates/`);
        fs.readFile(`${templatesDir}${templateName}.html`, `utf8`, (err, str) => {
            if (!err && isString(str)) {
                const finalString = interpolate(str, data);
                callback(false, finalString);
            } else {
                callback(`No template could be found`);
            }
        });
    } else {
        callback('A valid template name was not specified');
    }
};

const addUniversalTemplates = (_str, _data, callback) => {
    const str = isString(_str) ? _str : '';
    const data = isObject(_data) ? _data : {};
    // get the header
    getTemplate('_header', data, (err, headerString) => {
        if (!err && isString(headerString)) {
            getTemplate(`_footer`, data, (err, footerString) => {
                if (!err && isString(footerString)) {
                    const fullString = headerString + str + footerString;
                    callback(false, fullString);
                } else {
                    callback(`Could not find the footer template`);
                }
            })
        } else {
            callback(`Could not find the header template`);
        }
    });

};

const getStaticAsset =  (_fileName, callback) => {
    const fileName = isString(_fileName) ? _fileName : '';
    if (isString(fileName)) {
        const publicDir = path.join(__dirname, '/../public/');
        fs.readFile(`${publicDir}${fileName}`, (err, data) => {
            if (!err && data) {
                callback(false, data);
            } else {
                callback('No file could be found');
            }
        });
    } else {
        callback('A valid file name was not specified');
    }
};

const helpers = {
    hash: get_hash
    , parseJsonToObject
    , createRandomString
    , sendTwilioSms
    , getTemplate
    , interpolate
    , addUniversalTemplates
    , getStaticAsset
};

module.exports = helpers;