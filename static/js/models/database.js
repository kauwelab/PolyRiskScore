var mysql = require( 'mysql' );
const passwords = require('../passwords');

// Code from https://bezkoder.com/node-js-rest-api-express-mysql/ 

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'polyscore',
    password: passwords.getMySQLPassword(),
    database: 'polyscore', 
    multipleStatements: true
});

// open the MySQL connection
// connection.connect(error => {
//     if (error) throw error;
//     console.log("Successfully connected to the polyscore database.");
// });

module.exports = connection;
