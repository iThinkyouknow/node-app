
const environments = {
    staging: {
        httpPort: 3000
        , httpsPort: 3001
        , envName: 'staging'
        , hashingSecret: ''
        , maxChecks: 5
        , twilio: {
            accountSid: ''
            , authToken: ''
            , fromPhone: ''
        }
        , templateGlobals: {
            'appName': `UptimeChecker`
            , companyName: `NotARealCompany, Inc.`
            , yearCreated: '2018'
            , baseUrl: `http://localhost:3000`
        }
    }
    , production: {
        httpPort: 5000
        , httpsPort: 5001
        , envName: 'production'
        , hashingSecret: ''
        , maxChecks: 5
        , twilio: {
            accountSid: ''
            , authToken: ''
            , fromPhone: ''
        }
        , templateGlobals: {
            'appName': `UptimeChecker`
            , companyName: `NotARealCompany, Inc.`
            , yearCreated: '2018'
            , baseUrl: `http://localhost:5000`
        }
    }
};

const currentEnvironment = (typeof process.env.NODE_ENV === 'string') 
    ? process.env.NODE_ENV.toLowerCase()
    : '';

const envToExport = (typeof environments[currentEnvironment] === 'object')
    ? environments[currentEnvironment]
    : environments['staging'];


module.exports = envToExport;