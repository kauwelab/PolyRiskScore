var mysql = require( 'mysql' );
const passwords = require('../../../passwords');

// Code from https://bezkoder.com/node-js-rest-api-express-mysql/ 
// and from https://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection 

var dbConfig = {
    host: 'localhost',
    user: 'client',
    password: passwords.getMySQLClientPassword(),
    database: 'polyscore', 
    multipleStatements: true
}

var connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig);

    console.log("We ran handleDisconnect...")
    connection.connect(function(err) {
        console.log("There was an error connection")
        if (err) {
            console.log('error when connecting to db: ', err);
            setTimeout(handleDisconnect, 2000);
        }
    });

    connection.on('error', function(err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        }
        else {
            throw err;
        }
    });
}

handleDisconnect();

module.exports = connection;
