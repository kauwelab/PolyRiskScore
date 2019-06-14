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
const Sequelize = require('sequelize');

app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.listen(port, () => console.log(path.join(__dirname, 'static'))) //prints path to console

//API End Point
var busboy = require('connect-busboy'); //middleware for form/file upload
var fs = require('fs-extra');       //File System - for file manipulation
app.use(busboy());

function createMap(fileContents) {
    var Readable = stream.Readable;
    const s = new Readable();
    s.push(fileContents);
    s.push(null);
    vcf.readStream(s);
    var vcfMap = new Map();
    //var vcfArray = new Array(); 
    vcf.on('data', function (feature) {
        //console.log(feature); 
        //vcfArray.push({ key: feature['id'], val: feature['ref'] }); 
        vcfMap.set(feature['id'], feature['alt']);
    })
    vcf.on('end', function () {
        console.log('end of file')
        //TODO console.log(vcfMap);
        //return vcfArray; 
    })
    vcf.on('error', function (err) {
        console.error('it\'s not a vcf', err)
    })

    //TODO manually created map
    var vcfMapList = [];
    var vcfMap1 = new Map();
    vcfMap1.set("rs10438933", ["G", "C"]);
    vcfMap1.set("rs10192369", ["T", null]);
    vcfMapList.push(vcfMap1)
    var vcfMap2 = new Map();
    vcfMapList.push(vcfMap2)
    return vcfMapList;
    //let result = await stuff; 
    //console.log(result); 
}

function getCombinedORFromArray(ORs) {
    //calculate the combined odds ratio from the odds ratio array (ORs)
    var combinedOR = 0;
    ORs.forEach(function (element) {
        combinedOR += Math.log(element);
    });
    combinedOR = Math.exp(combinedOR);
    return combinedOR;
}

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
        text: `${req.body.name} (${req.body.email}) says: ${req.body.message}`,
        attachments: [
            {
                filename: req.files.gwas,
                path: req.file.path
            }
        ]
    };
    smptTrans.sendMail(mailOpts, (err, data) => {
        if (err) {
            res.writeHead(301, { Location: 'fail.html' });
            res.end();
        } else {
            res.writeHead(301, { Location: 'success.html' });
            res.end();
        }
    });
    res.writeHead(301, { Location: 'index.html' });
    res.end();
});

app.get('/calculate_score/', function (req, res) {
    //allows browsers to accept incoming data otherwise prevented by the CORS policy (https://wanago.io/2018/11/05/cors-cross-origin-resource-sharing/)
    res.setHeader('Access-Control-Allow-Origin', '*');

    //TODO this code prints the URL- length may be an issue 
    //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    //console.log(fullUrl);

    var snpMapList = createMap();

    if (snpMapList.length > 0) {
        var pValue = req.query.pValue;
        var disease = req.query.disease.toLowerCase();
        //TODO add correct disease table names to diseaseEnum!
        var diseaseEnum = Object.freeze({ "all": "ALL_TABLE_NAME", "adhd": "ADHD_TABLE_NAME", "als": "ALS", "alcheimer's disease": "ALCHEIMERS_TABLE_NAME", "depression": "DEPRESSION_TABLE_NAME", "heart disease": "HEART_DISEASE_TABLE_NAME", });
        var diseaseTable = diseaseEnum[disease];

        // config for your database
        const sequelize = new Sequelize('TutorialDB', 'root', '12345', {
            host: 'localhost',
            dialect: 'mssql',
            define: {
                schema: "dbo"
            },
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        });

        const Op = Sequelize.Op;
        sequelize
            .authenticate()
            .then(() => {
                const Model = Sequelize.Model;
                class Table extends Model { }
                Table.init({
                    // attributes
                    snp: {
                        type: Sequelize.STRING,
                        allowNull: false,
                    },
                    riskAllele: {
                        type: Sequelize.CHAR,
                        allowNull: false
                    },
                    pValue: {
                        type: Sequelize.FLOAT,
                        allowNull: false
                    },
                    oddsRatio: {
                        type: Sequelize.FLOAT,
                        allowNull: false
                    }
                }, {
                        sequelize,
                        modelName: diseaseTable,
                        name: {
                            primaryKey: true,
                            type: Sequelize.STRING
                        },
                        freezeTableName: true,
                        timestamps: false,
                        logging: false
                        // options
                    });
                //jsons for each person in a list
                var personResultJsons = [];
                snpMapList.forEach(function (snpMap) {
                    var resultsArray = [];
                    for (const [snp, alleleArray] of snpMap.entries()) {
                        alleleArray.forEach(function (allele) {
                            //TODO how to make this more clean?
                            if (allele !== null) {
                                resultsArray.push(Table.findAll({
                                    attributes: ['oddsRatio'],
                                    where: {
                                        pValue: {
                                            [Op.lt]: pValue
                                        },
                                        snp: snp,
                                        riskAllele: allele
                                    }
                                }));
                            }
                            else {
                                resultsArray.push(Table.findAll({
                                    attributes: ['oddsRatio'],
                                    where: {
                                        pValue: {
                                            [Op.lt]: pValue
                                        },
                                        snp: snp,
                                    }
                                }));
                            }
                        });
                    }
                    //push the json promises of the person onto the personResultJsons array
                    personResultJsons.push(Promise.all(resultsArray).then(resultsArray => {
                        var ORs = [];
                        //get results from each promise and combine them togther to get combined odds ratio
                        resultsArray.forEach(function (response) {
                            //TODO testing if results can return more than one odds ratio
                            if (response.length > 1) {
                                console.log("We have a result that is longer than 1: ");
                                console.log(response);
                            }
                            if (response.length > 0) {
                                ORs.push(response[0].oddsRatio);
                                console.log(response[0].oddsRatio);
                            }
                        });
                        var combinedOR = getCombinedORFromArray(ORs);
                        var results = { numSNPs: snpMap.size, pValueCutoff: pValue, disease: disease.toUpperCase(), combinedOR: combinedOR }
                        return JSON.stringify(results);
                    }));
                });
                //final promise that sends all results
                Promise.all(personResultJsons).then(jsons => {
                    console.log(jsons);
                    res.send(jsons);
                });
            })
            .catch(err => {
                console.error('You done messed up:', err);
            });
    }
    else {
        res.status(500).send("No SNPs were tested. Please upload a VCF file or type entries in the box above.")
    }
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
