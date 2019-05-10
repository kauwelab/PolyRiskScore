const sql = require('mssql')
var express = require('express');
const path = require('path')
var app = express();
const port = 3000
//app.listen(port)

//app.get('/test', (req, res) => res.send('Hello World!')) //Prints Hello World! to the page
app.use('/', express.static(path.join(__dirname, 'static')))

app.listen(port, () => console.log(path.join(__dirname, 'static'))) //prints path to console

app.get('/test', function (req, res) {
    //TODO how to get variables from req (aka request)?
    var input = req.query.input;
    var snpArray = input.split(",");
    var pValue = req.query.pValue;
    var disease = req.query.disease;
    var sql = require("mssql");

    // config for your database
    var config = {
        user: 'root',
        password: '12345',
        server: 'localhost',
        database: 'TutorialDB'
    };
    /*
//got some of this code from: https://stackoverflow.com/questions/44744946/node-js-global-connection-already-exists-call-sql-close-first
    new sql.ConnectionPool(config).connect().then(pool => {
        //TODO change query to get snps
        
        var snpArray = input.split(",");
        var sql = "SELECT * FROM ALS_OR2 where SNP IN ?";
        var test = pool.request().query(sql, [snpArray], function (err, result) {
            if (err) throw err;
            console.log(result);
        });
        return test;
        //return pool.request().query("select SNP from ALS_OR2")
    }).then(result => {
        let rows = result.recordset
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.status(200).json(rows);
        sql.close();
    }).catch(err => {
        res.status(500).send({ message: "${err}" })
        sql.close();
    });
    */

    // connect to your database
    sql.connect(config, function (err) {

        if (err) console.log(err);

        // create Request object
        var request = new sql.Request();

        //look into answer by Ritu here: https://stackoverflow.com/questions/5803472/sql-where-id-in-id1-id2-idn
        //may make this more efficient for large input data
        var stmt = 'SELECT * FROM ALS_OR2 where snp IN (';
        for (var i = 0; i < snpArray.length; ++i) {
            if (i != 0) {
                stmt += ', ';
            }
            stmt += "'" + snpArray[i] + "'";
        }
        stmt += ')';
        // query to the database and get the records
        request.query(stmt, function (err, recordset) {

            if (err) console.log(err)

            // send records as a response
            res.send(recordset);
        });
    });
});

/* app.get('/um', function (req, res) {
    res.send('Hello World!')
  }) */

/* app.post('/post', function (req, res) {
    res.send('Got a POST request')
}) */

//   app.put('/user', function (req, res) {
//     res.

//send('Got a PUT request at /user')
//   })

/* app.get('/', async (req, res) => {
    await sql.connect('mssql://SA:Constitution1787@localhost/PolyScore')
    const result = await sql.query`select Name from sys.Databases`
    console.dir(result)
    console.log(result)
    sql.close()
    res.send("Hello, World!"); //loads static folder
}); */
// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });

//const port = 3000 

//THESE TWO LINES WILL OPEN THE PORT AND OUTPUT "HELLO, WORLD!"
//app.listen(port)
//app.get('/', (req, res) => res.send('Hello World!')) //Prints Hello World! to the page

//THESE TWO LINES WILL UPLOAD JUSTIN'S FILES AS STATIC FILES
//app.use('/', express.static(path.join(__dirname, 'static')))
//app.listen(port, ()=>console.log(path.join(__dirname, 'static'))) //prints path to console


//EXPERIMENTAL CODE FROM EXPRESS WEBSITE. 
//  app.get('/', function (req, res) {
//      res.send('Hello World!')
//    })

//    app.post('/', function (req, res) {
//     res.send('Got a POST request')
//   })

//   app.put('/user', function (req, res) {
//     res.send('Got a PUT request at /user')
//   })

//THIS CODE CONNECTS TO THE SQL SERVER DATABASE
// app.get('/', async (req, res) => {
//     sql.close()
//     await sql.connect('mssql://SA:Constitution1787@localhost/PolyScore')
//     const result = await sql.query`select Name from sys.Databases`
//     console.dir(result)
//     console.log(result)
//     sql.close() 
//     res.send(result); //loads static folder
// });
// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });

// async () => {
//     try {
//         await sql.connect('mssql://admin:Constitution1787@localhost/tempdb')
//         const result = await sql.query`select * from mytable where id = ${value}`
//         console.dir(result)
//         console.log(result)
//     } catch (err) {
//         console.log("Aw heck")
//         // ... error checks
//     }
// }

//UNCOMMENT ALL THE CODE BELOW TO USE SEQUELIZER TO CONNECT WITH SQL SERVER
// const Sequelize = require('sequelize'); 

// const sequelize = new Sequelize('PolyScore', 'SA', 'Constitution1787', {
//     host: 'localhost',
//     dialect: 'mssql',
//     freezeTableName: true,
//     define: {
//       // The `timestamps` field specify whether or not the `createdAt` and `updatedAt` fields will be created.
//       // This was true by default, but now is false by default
//       timestamps: false
//     }
//     //logging: 'true'
// });

// sequelize
//     .authenticate()
//     .then(() => {
//         console.log('Connection established.');
//     })
//     .catch(err => {
//         console.error('Unable to connect: ', err);
//     });

// const Model = Sequelize.Model;
// class User extends Model {}
// User.init({
//   // attributes
//   firstName: {
//     type: Sequelize.STRING,
//     allowNull: false
//   },
//   lastName: {
//   bestFriend: {
//     type: Sequelize.STRING
//     // allowNull defaults to true
//   }
// }, {
//   sequelize,
//   modelName: 'tiger'
//   // options
// });

// User.sequelize.sync({ force: true }).then(() => {
//     // Now the `users` table in the database corresponds to the model definition
//     return User.create({
//       firstName: 'John',
//       lastName: 'Hancock'
//     });
//   });



//  User.findAll().then(tigers => {
//    console.log("All users:", JSON.stringify(tigers, null, 2));
//  });

// User.create({ firstName: "Jane", lastName: "Doe" }).then(jane => {
//   console.log("Jane's auto-generated ID:", jane.id);
// });
// User.sequelize.sync().then(() => {
//     Now the `users` table in the database corresponds to the model definition
//     return User.create({
//       firstName: 'Hobbes',
//       bestFriend: 'Calvin'
//     });
//   });

// User.create({ firstName: "Jane", bestFriend: "John" }).then(jane => {
//   console.log("Jane's auto-generated ID:", jane.id);
// });

//  User.findAll().then(tiger => {
//    console.log("All users:", JSON.stringify(tiger, null, 3));
//  });

//  User.destroy({
//     where: {},
//     truncate : true
//   }).then(() => {
//     console.log("Done");
//   });

// User.update({ bestFriend: null }, {
//     where: {}
//   }).then(() => {
//     console.log("Done");
//   });
