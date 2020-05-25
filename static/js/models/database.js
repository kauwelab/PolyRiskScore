var mysql = require( 'mysql' );
const passwords = require('../passwords');

// Code from https://bezkoder.com/node-js-rest-api-express-mysql/ 

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'polyscore',
    password: passwords.getMySQLPassword(),
    database: 'polyscore'
});

// open the MySQL connection
connection.connect(error => {
    if (error) throw error;
    console.log("Successfully connected to the polyscore database.");
});

module.exports = connection;

////Code from https://codeburst.io/node-js-mysql-and-promises-4c3be599909b 

// class Database {
//     constructor () {
//         this.connection = mysql.createConnection({
//             host: 'localhost',
//             user: 'polyscore',
//             password: passwords.getMySQLPassword(),
//             database: 'polyscore'
//         });
//     }

//     query( sql, args ) {
//         return new Promise( (resolve, reject) => {
//             this.connection.query(sql, args, (err, rows) => {
//                 if (err)
//                     return reject(err);
//                 resolve( rows );
//             });
//         });
//     }

//     close() {
//         return new Promise( (resolve, reject) => {
//             this.connection.end( err => {
//                 if (err)
//                     return reject(err);
//                 resolve();
//             });
//         });
//     }
// }