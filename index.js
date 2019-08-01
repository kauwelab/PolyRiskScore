// Require all the Dependencies
const express = require('express');
const path = require('path');
const nodeMailer = require('nodemailer');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars')
var vcf = require('bionode-vcf');
const stream = require('stream');
const Sequelize = require('sequelize');
const multer = require('multer');
const del = require('del');
const fsExtra = require('fs-extra');

//Define the port for app to listen on
const port = 3000


// Configure multer functionality
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
const cleanFolder = function (folderPath) {
    console.log("in clean folder");
    // delete files inside folder but not the folder itself
    del.sync([`${folderPath}/**`, `!${folderPath}`]);
};
const deleteFile = (file) => {
    fs.unlink(__dirname + "/uploads/" + file.originalname, (err) => {
        if (err) throw err;
    })
};
let timeOuts = [];
var upload = multer({ storage: storage });
cleanFolder(__dirname + "/uploads");

// Configure middleware
const app = express();

app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
var busboy = require('connect-busboy'); //middleware for form/file upload
var fs = require('fs-extra');       //File System - for file manipulation
app.use(busboy());
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
//TODO add correct disease table names to diseaseEnum!
var diseaseEnum = Object.freeze({ "all": "ALL_TABLE_NAME", "adhd": "ADHD_TABLE_NAME", "als": "ALS", "alzheimer's disease": "AD", "depression": "DEPRESSION_TABLE_NAME", "heart disease": "HEART_DISEASE_TABLE_NAME", });

// Helper Functions
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

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
                //console.log(sample); 
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
            console.log(vcfMapMaps);
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

function trimWhitespace(str) {
    return str.replace(/^\s+|\s+$/gm, '');
}


// ROUTES

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



    };
    smptTrans.sendMail(mailOpts, (err, data) => {
        if (err) {
            res.writeHead(301, { Location: 'fail.html' });
            res.end();
        }
    });
    res.writeHead(301, { Location: 'success.html' });
    res.end();
});

// POST route from upload GWAS form
app.post('/sendGwas', upload.single('file'), (req, res) => {
    console.log("in sendGWAS")

    const file = req.file;
    if (!file) {
        res.send("please select a file");
    }
    else {
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
            text: `From ${req.body.name} at (${req.body.email})
        Title: ${req.body.title}
        Author: ${req.body.author}
        Year: ${req.body.year}`,
            attachments: [
                {
                    path: file.path,
                    filename: file.filename
                }
            ]
        };
        console.log("after message")
        smptTrans.sendMail(mailOpts, (err, data) => {
            if (err) {
                res.writeHead(301, { Location: 'fail.html' });
                res.end();
            }
            else {
                res.writeHead(301, { Location: 'success_upload.html' });
                res.end();
                cleanFolder(__dirname + "/uploads");
            }
        });
    }

});

//see calculate_score.js for the code that calls this function (currently not in use)
// GET route for calculating prs 
app.get('/calculate_score/', async function (req, res) {
    //allows browsers to accept incoming data otherwise prevented by the CORS policy (https://wanago.io/2018/11/05/cors-cross-origin-resource-sharing/)
    res.setHeader('Access-Control-Allow-Origin', '*');
    //TODO this code prints the URL- length may be an issue 
    //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    //console.log(fullUrl);

    var vcfMapMaps = await createMap(req.query.fileContents);

    if (vcfMapMaps.size > 0) {
        var diseaseStudyMapArray = JSON.parse(req.query.diseaseStudyMapArray);
        var pValue = req.query.pValue;
        var rowsObj = await getValidTableRowsObj(pValue, diseaseStudyMapArray);
        var jsons = calculateScore(rowsObj, vcfMapMaps, pValue)
        res.send(jsons);
    }
    else {
        res.status(500).send("No SNPs were tested. Please upload a valid VCF file.")
    }
});

/**TODO this is duplicate code from the calculate_score.js file. Duplicate code is BAD!
 * Calculates the polygenetic risk score using table rows from the database and the vcfObj. 
 * P-value is required so the result can also return information about the calculation.
 * @param {*} rowsObj 
 * @param {*} vcfObj 
 * @param {*} pValue 
 * @return a string in JSON format of each idividual, their scores, and other information about their scores.
 */
function calculateScore(rowsObj, vcfObj, pValue) {
    var resultJsons = [];
    //push information about the calculation to the result
    resultJsons.push({ pValueCutoff: pValue, totalVariants: Array.from(vcfObj.entries())[0][1].size })
    //for each individual and each disease and each study in each disease and each snp of each individual, 
    //calculate scores and push results and relevant info to objects that are added to the diseaseResults array
    for (const [individualName, snpMap] of vcfObj.entries()) {
        var diseaseResults = [];
        rowsObj.forEach(function (diseaseEntry) {
            var studyResults;
            diseaseEntry.studiesRows.forEach(function (studyEntry) {
                studyResults = [];
                var ORs = []
                var snpsUsed = [];
                for (const [snp, alleleArray] of snpMap.entries()) {
                    alleleArray.forEach(function (allele) {
                        studyEntry.rows.forEach(function (row) {
                            //by now, we don't have to check for study or pValue, because rowsObj already has only those values
                            if (allele !== null) {
                                if (snp == row.snp && row.riskAllele === allele) {
                                    ORs.push(row.oddsRatio);
                                    snpsUsed.push(row.snp);
                                }
                            }
                            else {
                                if (snp == row.snp) {
                                    ORs.push(row.oddsRatio);
                                    snpsUsed.push(row.snp);
                                }
                            }
                        });
                    });
                }
                studyResults.push({
                    study: studyEntry.study,
                    oddsRatio: getCombinedORFromArray(ORs),
                    percentile: "",
                    numVariantsIncluded: ORs.length,
                    variantsIncluded: snpsUsed
                });
            });
            diseaseResults.push({
                disease: diseaseEntry.disease,
                studyResults: studyResults
            });
        });
        resultJsons.push({ individualName: individualName, diseaseResults: diseaseResults })
    }
    return JSON.stringify(resultJsons);
}

//
/**
 * Returns a list of diseaseRow objects, each of which contain a disease name and a list of its corresponding studiesRows objects. 
 * Each studyRow object contains a study name and its corresponding rows in the disease table with the given p-value.
 * See calculate_score.js for the code that calls this function.
 */
app.get('/study_table/', async function (req, res) {
    //allows browsers to accept incoming data otherwise prevented by the CORS policy (https://wanago.io/2018/11/05/cors-cross-origin-resource-sharing/)
    res.setHeader('Access-Control-Allow-Origin', '*');

    //an array of diseases mapped to lists of studies asociated with each disease (most often it is one disease to a list of one study)
    var diseaseStudyMapArray = JSON.parse(req.query.diseaseStudyMapArray);
    var pValue = req.query.pValue;

    var diseaseRows = await getValidTableRowsObj(pValue, diseaseStudyMapArray)
    res.send(diseaseRows);
});

/**
 * Gets the diseaseRows object, but includes the setup of the sequelize objects.
 * @param {*} pValue 
 * @param {*} diseaseStudyMapArray
 * @return a diseaseRows object. See "getDiseaseRows" function for details.
 */
async function getValidTableRowsObj(pValue, diseaseStudyMapArray) {
    // config for the database
    const sequelize = new Sequelize('TutorialDB', 'root', '12345', {
    //const sequelize = new Sequelize('PolyScore', 'SA', 'Constitution1787', {
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

    return sequelize
        .authenticate()
        .then(async function () {
            //gets a diseaseRows list to send to the client
            var diseaseRows = await getDiseaseRows(sequelize, pValue, diseaseStudyMapArray);
            return diseaseRows;
        });
}

app.get('/get_studies/', function (req, res){
    
    var studyObject0 = {reference: "number 1", articleName: "john", URL: "https://www.bountysource.com/issues/76999512-connectionerror-connection-lost-write-econnreset-when-inserting-long-string"}
    var studyObject1 = {reference: "number 2", articleName: "jacob", URL: "https://www.google.com/search?q=object.pluralize&rlz=1C1XYJR_enUS815US815&oq=object.pluralize&aqs=chrome..69i57.4710j0j7&sourceid=chrome&ie=UTF-8"}
    var studyObject2 = {reference: "number 3", articleName: "jingle", URL: "http://docs.sequelizejs.com/manual/getting-started.html"}
    var studyObject3 = {reference: "number 4", articleName: "heimer", URL: "http://docs.sequelizejs.com/manual/getting-started.html"}
    var studiesArray = []
    studiesArray.push(studyObject0)
    studiesArray.push(studyObject1)
    studiesArray.push(studyObject2)
    studiesArray.push(studyObject3)
    

    const sequelize = new Sequelize('PolyScore', 'joepete2', 'Petersme1', {
        host: 'localhost',
        port: 1434,
        dialect: 'mssql',
        logging: false
    })

    sequelize
    .authenticate()
    .then(() => {
        console.log('connection is up and running')

    })
    .catch(err => {
        console.error('nope, that didnt work', err)
    });

    const Model = Sequelize.Model;
    class Studies extends Model {}
    Studies.init({
        reference: {
            type: Sequelize.STRING
        },
        articleName: {
            type: Sequelize.STRING
        },
        URL: {
            type: Sequelize.STRING
        },
        studyID: {
            type: Sequelize.INTEGER
        }
    }, {
        sequelize, 
        modelName: 'Studies',
        freezeTableName: true,
        timestamps: false
    });
// the find all returns an array, so creat three seperate arrays of references, names, and URLs and then 
// loop through those to create your study objects and then send those back to the client.
var tempReference = Studies.findAll({
    attributes: ['reference']
})
var tempArticleNames = Studies.findAll({
    attributes: ['articleName']
})
var tempURL = Studies.findAll({
    attributes: ['URL']
})

for (var i = 0; i < tempReference.length; ++i) {
    var studyObject = {reference: tempReference[i], articleName: tempArticleNames[i], URL: tempURL[i]}
    studiesArray.push(studyObject)
}
   /* for (var i = 0; i <.length; ++i) {
        var tempReference = Studies.findAll({
            attributes: ['reference'],
            where: {
                studyID: i
            }
        })
        var tempArticleName = Studies.findAll({
            attributes: ['articleName'],
            where: {
                studyID: i
            }
        })
        var tempURL = Studies.findAll({
            attributes: ['URL'],
            where: {
                studyID: i
            }
        })
        var studyObject = {tempReference, tempArticleName, tempURL}
        studiesArray.push(studyObject)
    }*/
    



    res.send(studiesArray)

    
    /*const sequelize = new Sequelize('PolyScore', 'joepete2', 'Petersme1', {
        host: 'localhost',
        port: 1434,
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

    
    sequelize
    .authenticate()
    .then(() => {
        console.log('connection is good to go')
        const Model = Sequelize.Model;
        class Studies extends Model { }
        Studies.init({
            // attributes
            reference: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            studyName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            disease: {
                type: Sequelize.STRING,
                allowNull: false
            },
            datePublished: {
                type: Sequelize.STRING,
                allowNull: false
            },
            studyID: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            author: {
                type: Sequelize.STRING,
                allowNull: false
            },
            URL: {
                type: Sequelize.STRING,
                allowNull: false}
            }, {
            sequelize,
            modelName: 'Studies',
            name: {
                primaryKey: true,
                type: Sequelize.STRING
            },
            freezeTableName: true,
            timestamps: false,
            logging: false
            // options
        }); 
        
        var studiesArray = [];
        for (var i = 0; i < Studies.length(); i++) {
            var studyName = studiesArray.findAll({
                attributes: ['studyName'], 
                where: {
                    studyID: i
                }
            })
            console.log(studyName)
            var reference = studiesArray.findAll({
                attributes: ['reference'], 
                where: {
                    studyID: i
                }
            })
            console.log(reference)
            var URL = studiesArray.findAll({
                attributes: ['URL'], 
                where: {
                    studyID: i
                }
            })
            console.log(URL)
            var studyObject = {reference: reference, studyName: studyName, URL: URL}
            studiesArray.push(studyObject);
        }
        //JSON.stringify(studiesArray);
        debugger;
       // return Promise.all(studiesArray).then(studyObjects => {
            console.log(studiesArray);
            res.send(studiesArray);
       // });
        

    })
    .catch(err => {
        console.error("that wasnt right...", err);
    }); */
});

/**
 * Returns a list of objects, each of which contains a disease name from the diseaseStudyMapArray 
 * and a list of corresponding studyRow objects from the given table.
 * @param {*} sequelize 
 * @param {*} pValue 
 * @param {*} diseaseStudyMapArray 
 * @return a diseaseRows object: a list of objects containing disease names and studyRow objects
 */
async function getDiseaseRows(sequelize, pValue, diseaseStudyMapArray) {
    var diseaseRows = [];
    //for each disease, get it's table from the database 
    for (var i = 0; i < diseaseStudyMapArray.length; ++i) {
        var disease = diseaseStudyMapArray[i].disease;
        var studiesArray = diseaseStudyMapArray[i].studies;
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
                modelName: diseaseEnum[disease.toLowerCase()],
                name: {
                    primaryKey: true,
                    type: Sequelize.STRING
                },
                freezeTableName: true,
                timestamps: false,
                // options
            });
        //gets the ..............................................
        var studiesRows = await getStudiesRows(pValue, studiesArray, Table)
        diseaseRows.push({ disease: disease, studiesRows: studiesRows })
    }
    return diseaseRows;
}

/**
 * Returns a list of objects, each of which contains a study name from the study array 
 * and its corresponding rows in the given table.
 * @param {*} pValue 
 * @param {*} studiesArray 
 * @param {*} table 
 * @retunr a studyRows list: a list of objects containing study names and their corresponding table rows
 */
async function getStudiesRows(pValue, studiesArray, table) {
    var studiesRows = [];
    for (var i = 0; i < studiesArray.length; ++i) {
        var study = studiesArray[i];
        var rows = await getRows(pValue, study, table);
        studiesRows.push({ study: study, rows: rows })
    }
    return studiesRows;
}

/**
 * Returns a list of rows corresponding to the p-value cutoff and study in the given table
 * @param {*} pValue 
 * @param {*} study 
 * @param {*} table
 * @retrun a list of rows corresponding to the p-value and study in the table 
 */
async function getRows(pValue, study, table) {
    const Op = Sequelize.Op;
    var tableRows = [];
    //first find the valid results from the table (tests for valid p-value and study)
    tableRows.push(table.findAll({
        attributes: ['snp', 'riskAllele', 'pValue', 'oddsRatio'],
        where: {
            pValue: {
                [Op.lt]: pValue
            },
            study: study,
        }
    }));
    var rows = [];
    //loops through the valid found rows and converts them into objects which are stored in an array and returned.
    return Promise.all(tableRows).then(tableRows => {
        //Result seems to be an array of arrays. To reach the inner arrays (the actual rows), we have to go through the first array.
        var tableRows = tableRows[0];
        tableRows.forEach(function (tableRow) {
            var row = {
                snp: tableRow.snp,
                riskAllele: tableRow.riskAllele,
                pValue: tableRow.pValue,
                oddsRatio: tableRow.oddsRatio
            }
            rows.push(row);
        });
        return rows;
    })
}

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
