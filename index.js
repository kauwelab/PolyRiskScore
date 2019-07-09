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
const fsys = require('fs');

app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.listen(port, () => {
    var welcomeMessages = [];
    welcomeMessages.push("Welcome to the Polyscore Server!");
    welcomeMessages.push("Your faithful server is up and ready to conquer!");
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

function createMap(fileContents) {
    var Readable = stream.Readable;
    const s = new Readable();
    s.push(fileContents);
    s.push(null);
    vcf.readStream(s);
    var vcfMapMaps = new Map();
    var numSamples = 0;
    vcf.on('data', function (vcfLine) {
        if (numSamples === 0) {
            numSamples = vcfLine.sampleinfo.length;
            vcfLine.sampleinfo.forEach(function (sample) {
                vcfMapMaps.set(sample.NAME, new Map());
            });
        }
        //gets all possible alleles for the current id
        var possibleAlleles = [];
        possibleAlleles.push(vcfLine.ref);
        var altAlleles = vcfLine.alt.split(/[,]+/);
        var i;
        for (i = 0; i < altAlleles.length; i++) {
            if (altAlleles[i] == ".") {
                altAlleles.splice(i);
            }
        }
        if (altAlleles.length > 0) {
            possibleAlleles = possibleAlleles.concat(altAlleles);
        }

        vcfLine.sampleinfo.forEach(function (sample) {
            var newMap = vcfMapMaps.get(sample.NAME);
            //gets the allele indices
            var alleles = sample.GT.split(/[|/]+/, 2);
            //gets the alleles from the allele indices and replaces the indices with the alleles.
            var i;
            for (i = 0; i < alleles.length; i++) {
                //if the allele is ".", treat it as the ref allele
                if (alleles[i] == ".") {
                    alleles[i] = possibleAlleles[0];
                }
                else {
                    alleles[i] = possibleAlleles[alleles[i]];
                }
            }
            newMap.set(vcfLine.id, alleles);
            vcfMapMaps.set(sample.NAME, newMap);
        });
    })
    vcf.on('error', function (err) {
        console.error('it\'s not a vcf', err)
    })

    return new Promise(function (resolve, reject) {
        vcf.on('end', function () {
            resolve(vcfMapMaps);
        });
    });
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    //TODO this code prints the URL- length may be an issue 
    //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    //console.log(fullUrl);

    var vcfMapMaps = await createMap(req.query.fileString);

    if (vcfMapMaps.size > 0) {
        var pValue = req.query.pValue;
        var disease = req.query.disease.toLowerCase();
        //TODO add correct disease table names to diseaseEnum!
        var diseaseEnum = Object.freeze({ "all": "ALL_TABLE_NAME", "adhd": "ADHD_TABLE_NAME", "als": "ALS", "alzheimer's disease": "AD", "depression": "DEPRESSION_TABLE_NAME", "heart disease": "HEART_DISEASE_TABLE_NAME", });
        var diseaseTable = diseaseEnum[disease];

        var study = req.query.study;
        if (study.includes("(Largest Cohort)")) {
            study = trimWhitespace(study.replace("(Largest Cohort)", ""));
        }
        else if (study.includes("(High impact)")) {
            study = trimWhitespace(study.replace("(High impact)", ""));
        }

        // config for your database
        //const sequelize = new Sequelize('TutorialDB', 'root', '12345', {
        const sequelize = new Sequelize('PolyScore', 'SA', 'Constitution1787', {
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
            },
            logging: false
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
                var resultJsons = [];
                resultJsons.push({ pValueCutoff: pValue, totalVariants: Array.from(vcfMapMaps.entries())[0][1].size }) //TODO this needs to be more clean and safe
                for (const [individualName, snpMap] of vcfMapMaps.entries()) {
                    var resultsArray = [];
                    for (const [snp, alleleArray] of snpMap.entries()) {
                        alleleArray.forEach(function (allele) {
                            //TODO how to make this more clean?
                            if (allele !== null) {
                                if (study == "Lambert et al., 2013") {
                                    resultsArray.push(Table.findAll({
                                        attributes: ['oddsRatio', 'snp'],
                                        where: {
                                            pValue: {
                                                [Op.lt]: pValue
                                            },
                                            snp: snp,
                                            study: study,
                                            minorAllele: allele
                                        }
                                    }));
                                }
                                else {
                                    resultsArray.push(Table.findAll({
                                        attributes: ['oddsRatio', 'snp'],
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
                            }
                            else {
                                resultsArray.push(Table.findAll({
                                    attributes: ['oddsRatio', 'snp'],
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
                    resultJsons.push(Promise.all(resultsArray).then(resultsArray => {
                        var ORs = [];
                        var snpORMap = new Map();
                        //get results from each promise and combine them togther to get combined odds ratio
                        resultsArray.forEach(function (response) {
                            //TODO testing if results can return more than one odds ratio- that would be a bad sign!
                            if (response.length > 1) {
                                console.log("We have a result that is longer than 1: ");
                            }
                            if (response.length > 0) {
                                snpORMap.set(response[0].snp, response[0].oddsRatio);
                                //ORs.push(response[0].oddsRatio);
                            }
                        });
                        var combinedOR = getCombinedORFromArray(Array.from(snpORMap.values()));

                        var studyResultTemp = {
                            study: study,
                            oddsRatio: combinedOR,
                            percentile: "",
                            numVariantsIncluded: snpORMap.size,
                            variantsIncluded: Array.from(snpORMap.keys())
                        }
                        var diseaseResultTemp = {
                            disease: disease.toUpperCase(),
                            studyResults: [studyResultTemp]
                        }
                        var resultTemp = {
                            individualName: individualName,
                            diseaseResults: [diseaseResultTemp]
                        };

                        var foundIndividual = false;
                        //see if the individual is in the array
                        resultJsons.forEach(function (jsonObj) {
                            //if the individual is already in the array
                            if (jsonObj.individualName == individualName) {
                                foundIndividual = true;
                                var foundDisease = false;
                                //see if the individual already has results for this disease
                                jsonObj.diseaseResults.forEach(function (diseaseResult){
                                    //if the disease is in the individual's array, add the study results to the disease array
                                    if (diseaseResult.disease.toLowerCase() == disease.toLowerCase()) {
                                        found = true;
                                        diseaseResult.studyResults.push(studyResultTemp);
                                        break;
                                    }
                                });
                                //if the disease is not in the individual's array, add the disease and the study results to the individual
                                if (foundDisease == false) {
                                    jsonObj.push(diseaseResultTemp)
                                }
                            }
                        });
                        //if the individual is not in the array, add them
                        if (foundIndividual == false) {
                            return resultTemp; //JSON.stringify(resultTemp);
                        }
                        //Don't return anything? return JSON.stringify(result);
                    }));
                }
                //final promise that sends all results
                Promise.all(resultJsons).then(jsons => {
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

// app.post('/download_results', function (req, res) {
//     var DOWNLOAD_DIR = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads/');
//     var file_name = "polyscore_" + getRandomInt(100000000);
//     if(req.body.fileFormat === "csv"){
//         file_name += ".csv";
//     } 
//     else{
//         file_name += ".txt";
//     }
//     var file_path = path.join(DOWNLOAD_DIR, file_name);
//     fsys.writeFile(file_path, req.body.resultText, function (err) {
//         if (err) throw err;
//         console.log('Saved!');
//     });
//     res.end(); 
// }) 

//   app.put('/user', function (req, res) {
//     res.class="md-form" id="file-form">

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
