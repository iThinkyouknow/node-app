
const {isPresentType} = require('../functions');
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config')

const isString = isPresentType('string');
const isNumber = isPresentType('number');
const isArray = isPresentType('array');
const isObject = isPresentType('object');

const getStringWSpaceIfValid = (str) => isString(str) ? ` ${str}` : '';

const getMissingFieldsError = (field = '') => ({Error: `Missing required fields${getStringWSpaceIfValid(field)}`});

const verifyToken = (id, phone, callback) => {
    console.log(`id: ${id}`)
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && isPresentType('object')(tokenData)) {
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                console.log('phone or expires is incorrect')
                callback(false);
            }
        } else {
            console.log('error reading file')
            callback(false);
        }
        
    });
};

// HTML HANDLERS
const index = (data, callback) => {
    if (data.method === 'get') {

        // prepare data for interpolation
        const templateData = {
            'head.title': 'Uptime monitoring made simple'
            , 'head.description': 'We offer free simple uptime monitoring for http sites'
            // , 'body.title': 'Hello templated world!'
            , 'body.class': 'index'
        };


        // read in a template as a string
        helpers.getTemplate('index', templateData, (err, str) => {
            if (!err && str) {

                helpers.addUniversalTemplates(str, templateData, (err, returnedString) => {
                    if (!err && isString(returnedString)) {
                        callback(200, returnedString, 'html');
                    } else {
                        callback(500, undefined, 'html');
                    }
                });

                
            } else {
                callback(500, undefined, 'html');
            }
        });
    } else {
        callback(405, undefined, 'html')
    }
};

const accountCreate = (data, callback) => {
    if (data.method === 'get') {

        // prepare data for interpolation
        const templateData = {
            'head.title': 'Create an account'
            , 'head.description': 'Signup is easy'
            // , 'body.title': 'Hello templated world!'
            , 'body.class': 'accountCreate'
        };


        // read in a template as a string
        helpers.getTemplate('accountCreate', templateData, (err, str) => {
            if (!err && str) {

                helpers.addUniversalTemplates(str, templateData, (err, returnedString) => {
                    if (!err && isString(returnedString)) {
                        callback(200, returnedString, 'html');
                    } else {
                        callback(500, undefined, 'html');
                    }
                });

                
            } else {
                callback(500, undefined, 'html');
            }
        });
    } else {
        callback(405, undefined, 'html')
    }
}; 



// JSON API
const _users = {
    post: (data, callback) => {
        //required: firstName, lastName, phone, password, tosAgreement
        //opt: none
        
        const firstName = isString(data.payload.firstName) 
            ? data.payload.firstName.trim()
            : '';

        const lastName = isString(data.payload.lastName) 
            ? data.payload.lastName.trim()
            : '';

        const password = isString(data.payload.password) 
            ? data.payload.password.trim()
            : '';

        const phone = (isString(data.payload.phone) && data.payload.phone.trim().length === 10)
            ? data.payload.phone.trim()
            : '';

        const tosAgreement = isPresentType('boolean')(data.payload.tosAgreement) 
            ? data.payload.tosAgreement
            : false;

        if (isString(firstName) 
            && isString(lastName) 
            && isString(password) 
            && isString(phone) 
            && tosAgreement) {
            
            _data.read('users', phone, (err, data) => {
                if (err) {
                    // hash password
                    const hashedPassword = helpers.hash(password);
                    
                    if (isString(hashedPassword)) {
                        const userObject = {
                            firstName,
                            lastName,
                            phone,
                            hashedPassword,
                            tosAgreement
                        };

                        _data.create('users', phone, userObject, (err) => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {Error: 'Could not create the new user' + err});
                            }
                        })
                    } else {
                        callback(500, {Error: 'Could not hash the user\'s password'})
                    }
                    
                    
                    
                } else {
                    callback(400, {Error: 'A user with that phone number already exists'});
                }
            })
            

        } else {
            callback(400, {Error: 'Missing required fields'})
        }


    }
    //@todo only let authenticated users access own object; not anyone else's
    , get: (data, callback) => {
        //validate phone
        const {queryStringObject = {}} = data;
        const _phone = queryStringObject.phone;
        const phone = isString(_phone) && _phone.trim().length === 10
            ? _phone.trim()
            : false;

        if (phone) {

            const token = isString(data.headers.token)
                ? data.headers.token
                : '';

            verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid === true) {
                    _data.read('users', phone, (err, data) => {
                        if (!err && data) {
                            // remove hashed password bedfore returning it to user
                            
                            const dataWOPassword = {
                                ...data,
                                hashedPassword: undefined
                            }
                            callback(200, dataWOPassword)
                        } else {
                            callback(404);
                        }
                    });
                } else {
                    callback(403, {Error: 'Missing required token in header or token is invalid'})
                }
            });

            
        } else {
            callback(400, {Error: 'Missing required fields'});
        }



    }
    , put: (data, callback) => {
        //optional data: firstName, lastname, password (at least one must be specified)
        // @todo only let authenticated user update their own object
        // check required fields
        const firstName = isString(data.payload.firstName) 
            ? data.payload.firstName.trim()
            : '';

        const lastName = isString(data.payload.lastName) 
            ? data.payload.lastName.trim()
            : '';

        const password = isString(data.payload.password) 
            ? data.payload.password.trim()
            : '';

        const phone = (isString(data.payload.phone) && data.payload.phone.trim().length === 10)
            ? data.payload.phone.trim()
            : '';

        if (isString(phone)) {
            if (isString(firstName) 
            || isString(lastName) 
            || isString(password)) {

                const token = isString(data.headers.token)
                    ? data.headers.token
                    : '';
                
                verifyToken(token, phone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        _data.read('users', phone, (err, userData) => {
                            if (!err && userData) {
                                //update the fields necessary
                                const newUser = {
                                    firstName: isString(firstName) ? firstName : userData.firstName
                                    , lastName: isString(lastName) ? lastName : userData.lastName
                                    , hashedPassword: isString(password) ? helpers.hash(password) : userData.hashedPassword
                                }
        
                                _data.update('users', phone, newUser, (err) => {
                                    if (!err) {
                                        callback(200);
                                    } else {
                                        console.log(err);
                                        callback(500, {Error: 'Could not update user'});
                                    }
                                })
        
                            } else {
                                callback(400, {Error: 'Missing required field'})
                            } 
                        });

                    } else {
                        callback(403, {Error: 'Missing required token in header or token is invalid'})
                    }
                });
            }
        } else {
            callback(400, {Error: 'Missing required field'})
        }

        
    }
    , delete: (data, callback) => {

        //required phone
        //@todo only auth user to do it, not anyone else
        //@todo cleanup any other data files associated with user
        const {queryStringObject = {}} = data;
        const _phone = queryStringObject.phone;
        const phone = isString(_phone) && _phone.trim().length === 10
            ? _phone.trim()
            : false;

        if (phone) {
            const token = isString(data.headers.token)
            ? data.headers.token
            : '';
        
            verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
                    _data.read('users', phone, (err, data) => {
                        if (!err && data) {
                            // remove hashed password bedfore returning it to user
                            
                            _data.delete('users', phone, (err) => {
                                if (!err) {
                                    callback(200);
        
                                } else {
                                    callback(500, {Error: 'You could not be deleted'});
                                    console.log(err);
                                }
                            });
                        } else {
                            callback(400, {Error: 'could not find specified user'});
                        }
                    });
                } else {
                    callback(403, {Error: 'Missing required token in header or token is invalid'});
                }
            });
        
        } else {
            callback(400, {Error: 'Missing required fields'});
        }

    }
}

const users = (data, callback) => {

    _users[data.method] !== undefined 
        ? _users[data.method](data, callback)
        : callback(405);
};



//tokens
const _tokens = {
    post: (data, callback) => {
        // required phone password

        const password = isString(data.payload.password) 
            ? data.payload.password.trim()
            : '';

        const phone = (isString(data.payload.phone) && data.payload.phone.trim().length === 10)
            ? data.payload.phone.trim()
            : '';

        if (isString(password) && isString(phone)) {
            _data.read('users', phone, (err, userData) => {
                if (!err && userData) {
                    // hash sent password and compare to sent password
                    const hashedPassword = helpers.hash(password);
                    if (hashedPassword === userData.hashedPassword) {
                    // set expiration date 1 hour into the future
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        phone
                        , id: tokenId
                        , expires
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            console.log(err);
                            callback(500, {Error: 'Could not create the new token'});
                        }
                    });

                    } else {
                        callback(400, {Error: 'Password did not match user\'s password'})
                    }

                } else {
                    callback(400, {Error: 'Could not find specified user'})
                }
            })

        } else {
            callback(400, {Error: 'Missing required fields'})
        }
    }
    , get: (data, callback) => {
        //check if id is valid
        const returnedId = data.queryStringObject.id
        const id = isString(returnedId) && returnedId.trim().length === 20
            ? returnedId
            : '';

        if (isString(id)) {
            _data.read('tokens', id, (err, tokenData) => {
                if (!err & isPresentType('object')(tokenData)) {
                    const returnData = {
                        ...tokenData,
                        hashedPassword: undefined
                    };
                    callback(200, returnData);

                } else {
                    callback(404);
                }
                
            });
        } else {
            callback(400, {Error: 'Missing required Fields'});
        }

    }
    , put: (data, callback) => {
        // required: id, extend; optional: none
        console.log(data.payload);
        const id = (isString(data.payload.id) && data.payload.id.trim().length === 20)
            ? data.payload.id.trim()
            : '';

        if (isString(id) && data.payload.extend === true) {
            _data.read('tokens', id, (err, tokenData) => {
                if (!err && tokenData) {
                    if (tokenData.expires > Date.now()) {
                        const newTokenData = {
                            ...tokenData
                            , expires: Date.now() + 1000 * 60 * 60
                        };

                        _data.update('tokens', id, newTokenData, (err) => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {Error: 'Could not update token\'s expiration'})
                            }
                        })

                    } else {
                        callback(400, {Error: 'The token has already expired and cannot be extended'});
                    }
                } else {
                    callback(404, {Error: 'Specified Token does not exist'});
                }
            })

        } else {
            callback(400, getMissingFieldsError('id'))
        }


    }
    , delete: (data, callback) => {
        //required phone
        //@todo only auth user to do it, not anyone else
        //@todo cleanup any other data files associated with user
        const {queryStringObject = {}} = data;
        const _id = queryStringObject.id;
        const id = isString(_id) && _id.trim().length === 20
            ? _id.trim()
            : false;

        if (id) {
            _data.read('tokens', id, (err, data) => {
                if (!err && data) {
                    // remove hashed password bedfore returning it to user
                    
                    _data.delete('tokens', id, (err) => {
                        if (!err) {
                            callback(200);

                        } else {
                            callback(500, {Error: 'Token could not be deleted'});
                            console.log(err);
                        }
                    });
                } else {
                    callback(400, {Error: 'could not find specified id'});
                }
            })
        } else {
            callback(400, getMissingFieldsError('id'));
        }
    }
    
};


const tokens = (data, callback) => {

    _tokens[data.method] !== undefined 
        ? _tokens[data.method](data, callback)
        : callback(405);
};

const _checks = {
    post: (data, callback) => {
        // required protocol, url, method, successcase, timeoutSeconds
        const acceptableProtocols = {
            http: true
            , https: true
        };

        const acceptableMethods = {
            post: true
            , get: true
            , put: true
            , delete: true
        };

        const protocol = isString(data.payload.protocol) && acceptableProtocols[data.payload.protocol.trim().toLowerCase()] === true
            ? data.payload.protocol
            : '';
        
        const url = isString(data.payload.url) && isString(data.payload.url.trim())
            ? data.payload.url
            : '';

        const method = isString(data.payload.method) && acceptableMethods[data.payload.method.trim().toLowerCase()] === true
            ? data.payload.method
            : '';

        const timeoutSeconds = isNumber(data.payload.timeoutSeconds) && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds > 0 && data.payload.timeoutSeconds < 6
            ? data.payload.timeoutSeconds
            : NaN

        if (isString(protocol) && isString(url) && isString(method) && isPresentType('array')(data.payload.successCodes) && isNumber(timeoutSeconds)) {
            // get token from headers
            const token = isString(data.headers.token)
                ? data.headers.token
                : '';

            _data.read('tokens', token, (err, tokenData) => {
                if (!err && isObject(tokenData)) {
                    const userPhone = tokenData.phone;

                    _data.read('users', userPhone, (err, userData) => {
                        if (!err && isObject(userData)) {
                            const userChecks = isArray(userData.checks)
                                ? userData.checks
                                : [];

                            if (userChecks.length < config.maxChecks) {
                                // create randomId for checks
                                const checkId = helpers.createRandomString(20);
                                // create check object, and include the user's phone
                                const checkObject = {
                                    id: checkId
                                    , userPhone
                                    , protocol
                                    , url
                                    , method
                                    , successCodes: data.payload.successCodes
                                    , timeoutSeconds
                                };

                                _data.create('checks', checkId, checkObject, (err) => {
                                    if (!err) {

                                    const newUserChecks = (userChecks.length < config.maxChecks)
                                        ? [...userChecks, checkObject]
                                        : userChecks;
                                    // save the new user data
                                    const newUserData = {
                                        ...userData
                                        , checks: newUserChecks
                                    }
                                    _data.update('users', userPhone, newUserData, (err) => {
                                        if (!err) {
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, {Error: 'could not update user\'s check'});
                                        }
                                    })

                                    } else {
                                        console.log(err);
                                        callback(500, {Error: 'Could not create the new check'});
                                    }
                                })
                                
                            } else {
                                callback(400, {Error: `The user already has the max number of checks (${config.maxChecks})`});
                            }

                            
                        } else {
                            callback(403);
                        }
                    });

                } else {
                    callback(403)
                }
            });
        } else {
            callback(400, getMissingFieldsError(`protocol: ${protocol}, url : ${url}, method: ${method}, successcodes: ${data.payload.successCodes}, timeoutseconds: ${timeoutSeconds}`))
        }
    }
    , get: (data, callback) => {
        //check if id is valid
        const returnedId = data.queryStringObject.id
        const id = isString(returnedId) && returnedId.trim().length === 20
            ? returnedId
            : '';

        if (isString(id)) {
            _data.read('checks', id, (err, checkData) => {
                if (!err & isPresentType('object')(checkData)) {
                    // verify token is valid and belongs to user
                    const token = isString(data.headers.token) 
                        ? data.headers.token
                        : '';

                        console.log(token, checkData.userPhone);

                    verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            callback(200, checkData);
                        } else {
                            callback(403, {Error: 'incorrect token'});
                        }
                    });
                   
                } else {
                    callback(404);
                }
                
            });
        } else {
            callback(400, {Error: 'Missing required Fields'});
        }

    }
    , put: (data, callback) => {
        // required: id
        // optional 
        /**userPhone
        , protocol
        , url
        , method
        , successCodes: data.payload.successCodes
        , timeoutSeconds **/
        const acceptableProtocols = {
            http: true
            , https: true
        };

        const acceptableMethods = {
            post: true
            , get: true
            , put: true
            , delete: true
        };

        const id = isString(data.payload.id)
            ? data.payload.id
            : '';

        const protocol = isString(data.payload.protocol) && acceptableProtocols[data.payload.protocol.trim().toLowerCase()] === true
            ? data.payload.protocol
            : '';
        
        const url = isString(data.payload.url) && isString(data.payload.url.trim())
            ? data.payload.url
            : '';

        const method = isString(data.payload.method) && acceptableMethods[data.payload.method.trim().toLowerCase()] === true
            ? data.payload.method
            : '';

        const timeoutSeconds = isNumber(data.payload.timeoutSeconds) && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds > 0 && data.payload.timeoutSeconds < 6
            ? data.payload.timeoutSeconds
            : NaN

        if (isString(id)) { 
            if (isString(protocol) 
                || isString(url) 
                || isString(method) 
                || isArray(data.payload.successCodes) 
                || isNumber(timeoutSeconds)) {
                // get token from headers
                    //paused here!!!!
                    _data.read('checks', id, (err, checkData) => {
                        if (!err && isObject(checkData)) {
                            const token = isString(data.headers.token) 
                                ? data.headers.token
                                : '';

                            console.log(token, checkData.userPhone);

                            verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                                if (tokenIsValid) {
                                    const newCheckData = {
                                        ...checkData
                                        , protocol: isString(protocol) ? protocol : checkData.protocol
                                        , url: isString(url) ? url : checkData.url
                                        , method: isString(method) ? method : checkData.method
                                        , successCodes: isArray(data.payload.successCodes) ? data.payload.successCodes : checkData.successCodes
                                        , timeoutSeconds: isNumber(timeoutSeconds) ? timeoutSeconds : checkData.timeoutSeconds

                                    };
                                    console.log(`break here`);

                                    _data.update('checks', id, checkData, (err) => {
                                        if (!err) {
                                            callback(200, newCheckData);
                                        } else {
                                            callback(500, {Error: 'could not update the check'});
                                        }
                                    });

                                } else {
                                    callback(403, {Error: 'incorrect token'});
                                }
                            });
                        } else {
                            callback(400, getMissingFieldsError(`Check id: ${id}`))
                        }
                    });
                } else {
                    callback(400, getMissingFieldsError(`proto: ${protocol}, url: ${url}, method: ${method}, successCodes: ${data.payload.succeessCodes}, timeoutSeconds: ${timeoutSeconds}`));
                }
         
        } else {
            callback(400, getMissingFieldsError(`id: ${id}, optional: proto: ${protocol}, url: ${url}, method: ${method}, successCodes: ${data.payload.succeessCodes}, timeoutSeconds: ${timeoutSeconds}`));
        }



    }
    , delete: (data, callback) => {
        //required id
        
        const {queryStringObject = {}} = data;
        const _id = queryStringObject.id;
        const id = isString(_id) && _id.trim().length === 20
            ? _id.trim()
            : false;

        if (id) {
            _data.read('checks', id, (err, checkData) => {
                if (!err && checkData) {
                    const token = isString(data.headers.token) 
                        ? data.headers.token
                        : '';

                        

                    verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            _data.delete('checks', id, (err) => {
                                if (!err) {
                                    _data.read('users', checkData.userPhone, (err, userData) => {
                                        if (!err && isObject(userData)) {

                                            const userChecks = isArray(userData.checks)
                                                ? userData.checks
                                                : [];

                                            const checkPosition = userChecks.indexOf(id);

                                            if (checkPosition === -1) {
                                                callback(500, {Error: 'Could not find the check on the user\'s object'});
                                                return;
                                            }

                                            const newUserChecks = [...userChecks.slice(0, checkPosition), ...userChecks.slice(checkPosition)];
                                            const newUserData = {
                                                ...userData
                                                , userChecks: newUserChecks
                                            }
                                            _data.update('users', checkData.userPhone, newUserData, (err) => {
                                                if (!err) {
                                                    callback(200);
                                                } else {
                                                    callback(500, {Error: 'Could not update specified user'})
                                                }
                                                
                                            })
                                        } else {
                                            callback(500, {Error: 'Could not find the user who created the check'})
                                        }
                                    });
        
                                } else {
                                    callback(500, {Error: 'Check could not be deleted'});
                                    console.log(err);
                                }
                            });
                            
                        } else {
                            callback(403, {Error: 'incorrect token'});
                        }
                    });
                    
                    
                } else {
                    callback(400, {Error: 'could not find specified id'});
                }
            })
        } else {
            callback(400, getMissingFieldsError('id'));
        }
    }
};

const checks = (data, callback) => {

    _checks[data.method] !== undefined 
        ? _checks[data.method](data, callback)
        : callback(405);
};

const favicon = (data, callback) => {
    if (data.method === 'get') {
        helpers.getStaticAsset('favicon.ico', (err, data) => {
            console.log('fv');
            console.log(data);
            if (!err && data) {
                callback(200, data, 'favicon')
            } else {
                callback(500);
            }
        });
    } else {
        callback(405);
    }
};

const handlers_public = (data, callback) => {
    if (data.method === 'get') {
        const trimmedAssetName = data.trimmedPath.replace('public/', '').trim();
        if (trimmedAssetName.length > 0) {
            helpers.getStaticAsset(trimmedAssetName, (err, data) => {
                if (!err && data) {
                    // determine the content type and default to plain text

                    let contentType = 'plain';
                    console.log(data);

                    if (trimmedAssetName.indexOf('.css') > -1) {
                        contentType = 'css'
                    } else if (trimmedAssetName.indexOf('.png') > -1) {
                        contentType = 'png'

                    } else if (trimmedAssetName.indexOf('.jpg') > -1) {
                        contentType = 'jpg'

                    } else if (trimmedAssetName.indexOf('.ico') > -1) {
                        contentType = 'favicon'

                    } 

                    callback(200, data, contentType);
                } else {
                    callback(404);
                }
            })
        }
    } else {
        callback(405)
    }
};

const exampleError = (data, callback) => {
    const err = new Error('This is an example error');
    throw(err);
}

const handlers = {
    ping: (data, callback) => {
        //Callback a http status code, & a payload obj
        callback(200);
    }
    , users
    , _users
    , notFound: (data, callback) => {
        callback(404)
    }
    , tokens
    , checks
    , index
    , accountCreate
    , favicon
    , public: handlers_public
    , exampleError
};



module.exports = handlers;