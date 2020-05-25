var mysql = require( 'mysql' );

//Code from https://codeburst.io/node-js-mysql-and-promises-4c3be599909b 

class Database {
    constructor () {
        this.connection = mysql.createConnection({
            host: 'localhost',
            user: 'polyscore',
            password: passwords.getMySQLPassword(),
            database: 'polyscore'
        });
    }

    query( sql, args ) {
        return new Promise( (resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve( rows );
            });
        });
    }

    close() {
        return new Promise( (resolve, reject) => {
            this.connection.end( err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}