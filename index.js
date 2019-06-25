const express = require('express');
const path = require('path');
const nodeMailer = require('nodemailer');
const bodyParser = require('body-parser');
var vcf = require('bionode-vcf');
const stream = require('stream')
const app = express();
const port = 3000
const Sequelize = require('sequelize');
const formidable = require('formidable');

app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.listen(port, () => {
    var welcomeMessages = [];
    welcomeMessages.push("Welcome to the Polyscore Server!");
    welcomeMessages.push("Your faithful server up and ready to conquer!");
    welcomeMessages.push("Here to serve!");
    welcomeMessages.push("Service with a smile :D");
    welcomeMessages.push("Running just for you!");
    welcomeMessages.push("Polyscore server: at your service!");
    console.log(welcomeMessages[getRandomInt(welcomeMessages.length)]/*path.join(__dirname, 'static')*/) //prints a happy message on startup
});

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

//API End Point
var busboy = require('connect-busboy'); //middleware for form/file upload
var fs = require('fs-extra');       //File System - for file manipulation
app.use(busboy());


app.post('/parse_vcf', function (req, res) {
    //Find out how we'll handle vcf files with multiple people's info
    //Make sure this works with .gz files.
    var vcfMap = createMap(req.body.fileData); 
    console.log(vcfMap); 
    res.send(''); 
})

function createMap(fileContents){
    var Readable = stream.Readable; 
    const s = new Readable();

    s.push(fileContents);
    s.push(null);
    var oldVCF = vcf.emit; 
    vcf.emit = function(){
        var vcfMappie = new Map(); 
        var emitArgs = arguments;
        if(emitArgs['1']){
            vcfMappie.set(emitArgs['1']['id'], emitArgs['1']['alt']);
        }
        
    }
    vcf.readStream(s); 
    var vcfMap = new Map(); 
    //var vcfArray = new Array(); 
    vcf.on('data', function (feature){
        //console.log(feature); 
        //vcfArray.push({ key: feature['id'], val: feature['ref'] }); 
        vcfMap.set(feature['id'], feature['alt']);
    })  
 
    vcf.on('end', function(){
        console.log('end of file')
        console.log(vcfMap); 
        return vcfMap;  
    })
    vcf.on('error', function (err) {
        console.error('it\'s not a vcf', err)
    })

    //return vcfMap; 

    // vcfMap.set('rs11449', 'A'); 
    // vcfMap.set('rs84825', 'C');
    // vcfMap.set('rs84823', 'G'); 
    // return vcfMap; 
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

app.post('/uploadFile', function (req, res) {
    console.log('in here')
    var form = new formidable.IncomingForm();
    form.parse(req);
    form.on('fileBegin', function (name, file) {
        file.path = __dirname + '/uploads/' + file.name;
    });
    form.on('file', function (name, file) {
        console.log('Uploaded' + file.name);
    });

    res.sendFile(__dirname + '/static/upload_gwas.html');
});

app.get('/calculate_score/', async function (req, res) {
    //allows browsers to accept incoming data otherwise prevented by the CORS policy (https://wanago.io/2018/11/05/cors-cross-origin-resource-sharing/)
    var snpMap = createMap(req.body.fileData);
    res.setHeader('Access-Control-Allow-Origin', '*');
    var calculateScoreFunctions = require('./static/js/calculate_score');
    //TODO testing purposes 
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    console.log(fullUrl);

    //TODO get the fileString and boil it down to the snps and alleles instead of just spliting the file
    //var snpArray = req.query.fileString.split(new RegExp('[, \n]', 'g')).filter(Boolean);
    //var snpMap = getMapFromFileString(req.query.fileString);
    if (snpMap.size > 0) {
        var pValue = req.query.pValue;
        var disease = req.query.disease.toLowerCase();
        //TODO add correct disease table names to diseaseEnum!
        var diseaseEnum = Object.freeze({ "all": "ALL_TABLE_NAME", "adhd": "ADHD_TABLE_NAME", "als": "ALS", "alzheimer's disease": "ALZHEIMERS_TABLE_NAME", "depression": "DEPRESSION_TABLE_NAME", "heart disease": "HEART_DISEASE_TABLE_NAME", });
        var diseaseTable = diseaseEnum[disease];

        var study = req.query.study;
        if (study.includes("(Largest Cohort)")) {
            study = trimWhitespace(study.replace("(Largest Cohort)", ""));
        }
        else if (study.includes("(High impact)")) {
            study = trimWhitespace(study.replace("(High impact)", ""));
        }

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
                    },
                    study: {
                        type: Sequelize.STRING,
                        allowNull: false,
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
                        // options
                    });
                //jsons for each person in a list
                var personResultJsons = [];
                for (const [sampleName, snpMap] of vcfMapMaps.entries()) {
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
                                        study: study,
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
                                        study: study
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
                            //TODO testing if results can return more than one odds ratio- that would be a bad sign!
                            if (response.length > 1) {
                                console.log("We have a result that is longer than 1: ");
                            }
                            if (response.length > 0) {
                                ORs.push(response[0].oddsRatio);
                            }
                        });
                        var combinedOR = getCombinedORFromArray(ORs);
                        var results = { sampleName: sampleName, numSNPsTested: snpMap.size, pValueCutoff: pValue, disease: disease.toUpperCase(), combinedOR: combinedOR }
                        return JSON.stringify(results);
                    }));
                }
                //final promise that sends all results
                Promise.all(personResultJsons).then(jsons => {
                    res.send(jsons);
                }).catch(err => {
                    console.error('Something went wrong. Error sent to client too.', err);
                    res.status(500).send(err);
                });
            })
            .catch(err => {
                console.error('Something went wrong. Error sent to client too.', err);
                res.status(500).send(err);
            });
    }
    else {
        res.status(500).send("No SNPs were tested. Please upload a VCF file or type entries in the box above.")
    }
});

function trimWhitespace(str) {
    return str.replace(/^\s+|\s+$/gm, '');
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
