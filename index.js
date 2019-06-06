const express = require('express');
const path = require('path');
const nodeMailer = require('nodemailer');
const bodyParser = require('body-parser');
var vcf = require('bionode-vcf');
var fs = require('fs');
const stream = require('stream') 
const app = express();
const SqlString = require('sqlstring');
const port = 3000

app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.listen(port, () => console.log(path.join(__dirname, 'static'))) //prints path to console

//API End Point
var busboy = require('connect-busboy'); //middleware for form/file upload
var fs = require('fs-extra');       //File System - for file manipulation
app.use(busboy());


app.post('/parse_vcf', function (req, res) {
    //Find out how we'll handle vcf files with multiple people's info
    //Make sure this works with .gz files.
    //Will this work with a file object?
    var Readable = stream.Readable; 
    const s = new Readable();
    s.push(req.body.data);
    s.push(null);
    var myFile = req.body.data; 
    //vcf.read("/home/louisad/Documents/sample.vcf");
    vcf.readStream(s); 
    var vcfMap = new Map(); 
    vcf.on('data', function (feature){
        vcfMap.set(feature['id'], feature['ref']); 
    })  
 
    vcf.on('end', function(){
        console.log('end of file')
        console.log(vcfMap); 
        res.set('Content-Type', 'application/json')
        res.send(vcfMap)
    })
 
    vcf.on('error', function(err){
        console.error('it\'s not a vcf', err)
    })
})




// POST route from contact form
app.post('/contact', function (req, res) {
    let mailOpts, smptTrans;
    smptTrans = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'kauwelab19@gmail.com',
            pass: 'kauwelab2019!'
        }
    });
    mailOpts = {
        from: req.body.name + ' &lt;' + req.body.email + '&gt;',
        to: 'kauwelab19@gmail.com',
        subject: 'New message from contact form at PRS.byu.edu',
        text: `${req.body.name} (${req.body.email}) says: ${req.body.message}`
    };
    smptTrans.sendMail(mailOpts, (err, data) => {
        if (err) {
            res.writeHead(301, { Location: 'fail.html'});
            res.end();
        } else {
            res.writeHead(301, { Location: 'success.html'});
            res.end();
        }
    });
    res.writeHead(301, { Location: 'index.html' });
    res.end();
});

app.get('/test/', function (req, res) {
    //allows browsers to accept incoming data otherwise prevented by the CORS policy (https://wanago.io/2018/11/05/cors-cross-origin-resource-sharing/)
    res.setHeader('Access-Control-Allow-Origin', '*');
    var calculateScoreFunctions = require('./static/js/calculate_score');
    //TODO testing purposes 
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    console.log(fullUrl);

    //TODO get the fileString and boil it down to the snps and alleles instead of just spliting the file
    //var snpArray = req.query.fileString.split(new RegExp('[, \n]', 'g')).filter(Boolean);
    var snpMap = getMapFromFileString(req.query.fileString);
    if (snpMap.size > 0) {
        var pValue = req.query.pValue;
        var disease = req.query.disease.toLowerCase();
        var sql = require("mssql");

        // config for your database
        var config = {
            user: 'root',
            password: '12345',
            server: 'localhost',
            database: 'TutorialDB'
        };

        // connect to your database
        sql.connect(config, function (err) {

            if (err) console.log(err);

            // create Request object
            var request = new sql.Request();

            /* TODO
             * look into answer by Ritu here: https://stackoverflow.com/questions/5803472/sql-where-id-in-id1-id2-idn
             * may make this more efficient for large input data
             */
            //TODO
            /*
                for ()
                if (line contains ##)
                continue
                else if #
                find column numbers
                else
            */

            //TODO add correct disease table names to diseaseEnum!
            var diseaseEnum = Object.freeze({ "all": "ALL_TABLE_NAME", "adhd": "ADHD_TABLE_NAME", "als": "ALS_OR", "alcheimer's disease": "ALCHEIMERS_TABLE_NAME", "depression": "DEPRESSION_TABLE_NAME", "heart disease": "HEART_DISEASE_TABLE_NAME", });
            var diseaseTable = diseaseEnum[disease];
            //selects the "OR" from the disease table where the pValue is less than or equal to the value specified and where the snp is contained in the snps specified
            var stmt = "SELECT oddsRatio " +
                "FROM " + diseaseTable + " " +
                "WHERE (CONVERT(FLOAT, [pValue]) <= " + SqlString.escape(pValue) + ")"
            var i = 0;
            //TODO messy foreach- use forloop instead
            //TODO duplicate snps don't return OR value twice (makes combinedOR too small)
            for (const [snp, alleleArray] of snpMap.entries()) {
                if (i == 0) {
                    stmt += " AND (";
                }
                else if (i != 0) {
                    stmt += ' OR ';
                }

                //add a new snp with allele given
                if (alleleArray.length > 0) {
                    var j;
                    for (j = 0; j < alleleArray.length; ++j) {
                        if (alleleArray[j] !== null) {
                            if (j != 0) {
                                stmt += ' OR ';
                            }
                            stmt += "(snp = " + "'" + snp + "' " + "AND riskAllele = '" + alleleArray[j] + "')";
                        }
                        else {
                            if (j != 0) {
                                stmt += ' OR ';
                            }
                            stmt += "(snp = " + "'" + snp + "')";
                        }
                    }
                }
                else {
                    stmt += "(snp = " + "'" + snp + "')";
                }
                if (i == snpMap.size - 1) {
                    stmt += ')';
                }
                ++i;
            }

            // query to the database and get the records
            request.query(stmt, function (err, recordset) {

                if (err) {
                    res.status(500).send(err)
                    console.log(err)
                }
                else {
                    // send records as a response
                    //$('#response').html("# SNPs: " + snpArray.length + " &#13;&#10P Value Cutoff: " + fullPValue + " &#13;&#10Disease(s): " + disease + " &#13;&#10Combined Odds Ratio: " + combinedOR + " &#13;&#10Data: " + data);
                    var combinedOR = calculateScoreFunctions.getCombinedOR(recordset.recordset);
                    var results = { numSNPs: snpMap.size, pValueCutoff: pValue, disease: disease, combinedOR: combinedOR }
                    var jsonResults = JSON.stringify(results);
                    res.send(jsonResults);
                }

                //TODO is this where this goes?
                sql.close();
            });
        });
    }
    else {
        res.status(500).send("No SNPs were tested. Please upload a VCF file or type entries in the box above.")
    }
});

function getMapFromFileString(fileString) {
    var snpMap = new Map();
    var snpStringArray = fileString.split(new RegExp('[, \n]', 'g')).filter(Boolean);
    snpStringArray.forEach(snpString => {
        var snp = snpString;
        var allele = null;
        if (snpString.includes(":")) {
            snp = snpString.substring(0, snpString.indexOf(":"));
            snp = snp.trim();
            allele = snpString.substring(snpString.indexOf(":") + 1);
            allele = allele.trim();
        }
        if (!snpMap.has(snp)) {
            snpMap.set(snp, [allele])
        }
        else {
            var alleleArray = snpMap.get(snp);
            alleleArray.push(allele);
            snpMap.set(snp, alleleArray)
        }
    });
    return snpMap;
}

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

//Database name, username, and password. 
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
