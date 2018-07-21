const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

const { isString, isObject } = require('../functions')


const { log } = console;

const processHandlerResponse = (res, method, trimmedPath, statusCode, payload, _contentType) => {
    const contentType = isString(_contentType) ? _contentType : 'json';

    const validStatusCode = (typeof statusCode === 'number') ? statusCode : 200;


    // const payloadString = JSON.stringify(validPayload);



    let payloadString = '';
    let _payload = {};
    if (contentType === 'json') {
        res.setHeader('Content-Type', 'application/json');
        _payload = isObject(payload) ? payload : {};
        payloadString = JSON.stringify(payload);

    } else if (contentType === 'html') {
        res.setHeader('Content-Type', 'text/html');
        payloadString = isString(payload) ? payload : '';
    } else if (contentType === 'favicon') {
        res.setHeader('Content-Type', 'image/x-icon');
        payloadString = payload ? payload : '';
    } else if (contentType === 'css') {
        res.setHeader('Content-Type', 'text/css');
        payloadString = payload ? payload : '';
    } else if (contentType === 'png') {
        res.setHeader('Content-Type', 'image/png');
        payloadString = payload ? payload : '';
    } else if (contentType === 'jpg') {
        res.setHeader('Content-Type', 'image/jpeg');
        payloadString = payload ? payload : '';
    } else if (contentType === 'plain') {
        res.setHeader('Content-Type', 'text/plain');
        payloadString = payload ? payload : '';
    }

    

    // green for 200, red for others:
    (statusCode === 200)
        ? debug(`\x1b[32m%s\x1b[0m`, `Request is received at ${trimmedPath} with ${method} with payload: ${buffer} with query: ${JSON.stringify(queryStringObject)} with headers: ${JSON.stringify(headers)}`)
        : debug(`\x1b[31m%s\x1b[0m`, `Request is received at ${trimmedPath} with ${method} with payload: ${buffer} with query: ${JSON.stringify(queryStringObject)} with headers: ${JSON.stringify(headers)}`);

    debug(`response: ${payloadString}, header: ${validStatusCode}`)
    res.writeHead(validStatusCode);
    res.end(payloadString);
};




const unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    const queryStringObject = parsedUrl.query;
    // get the http method
    const method = req.method.toLowerCase();

    const headers = req.headers;

    // get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => {
        buffer += decoder.write(data);
        debug(data);
        debug(buffer);
    });

    req.on('end', () => {
        buffer += decoder.end();

        const chosenHandler = trimmedPath.indexOf('public') > -1
            ? router['public']
            : (typeof (router[trimmedPath]) !== 'undefined')
                ? router[trimmedPath]
                : router['api/notFound'];

        console.log(trimmedPath);
        console.log(chosenHandler);



        // if request is made to public whatever, serve public/whatever
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        try {
            chosenHandler(data, (statusCode, payload, _contentType) => {
                processHandlerResponse(res, method, trimmedPath, statusCode, payload, contentType);
            });
        } catch(e) {
            debug(e);
            processHandlerResponse(res, method, trimmedPath, 500, {Error: 'Unknown error occurred'}, 'json');
        }
        

    });

};

// instantiate the server
const httpServer = http.createServer(unifiedServer);


// start the server



//https
const httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '/../https/key.pem'))
    , cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

const httpsServer = https.createServer(httpsServerOptions, unifiedServer);





const router = {
    '': handlers.index
    , 'account/create': handlers.accountCreate
    , 'account/edit': handlers.accountEdit
    , 'account/deleted': handlers.accountDeleted
    , 'session/create': handlers.sessionCreate
    , 'session/deleted': handlers.sessionDeleted
    , 'checks/alll': handlers.checksList
    , 'checks/create': handlers.checksCreate
    , 'checks/edit': handlers.checksEdit
    , 'favicon.ico': handlers.favicon
    , 'public': handlers.public
    , ping: handlers.ping
    , 'api/users': handlers.users
    , 'api/notFound': handlers.notFound
    , 'api/tokens': handlers.tokens
    , 'api/checks': handlers.checks
    , 'examples/error': handlers.exampleError
}


const server = {
    init: () => {
        httpServer.listen(config.httpPort, () => {
            console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} in ${config.envName} mode now `);
        });

        httpsServer.listen(config.httpsPort, () => {
            console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} in ${config.envName} mode now `);
        });
    }
    , httpServer
    , httpsServer
    , httpsServerOptions
    , unifiedServer
    , router
};

module.exports = server;

