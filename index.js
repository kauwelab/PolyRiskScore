// Require all the Dependencies
const express = require('express');
const path = require('path');
const nodeMailer = require('nodemailer');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars')
const stream = require('stream');
const Sequelize = require('sequelize');
const multer = require('multer');
const del = require('del');
const fsExtra = require('fs-extra');
//the shared code module between the browser and server
const sharedCode = require('./static/js/sharedCode')

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

// Helper Functions
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

//TODO add correct disease table names to diseaseEnum! TODO- is this "enum" necessary?
//website name to table name "enum"
global.diseaseEnum = Object.freeze({ "adhd": "ADHD", "als": "ALS", "ad": "AD", "dep": "DEP", "chd": "CHD", });

/**
 * Parses the vcf fileContents into a vcfObj that is used to calculate the score
 * @param {*} fileContents 
 */
function parseVCFToObj(fileContents) {
    var Readable = stream.Readable;
    const s = new Readable();
    s.push(fileContents);
    s.push(null);
    //Deletes the previous vcf module and newly reloads it. This prevents the events 'data', 'error', and 'end' from being 
    //added to the vcf module and stacking up over time. Previously, every time this method was called, these events would 
    //be called +1 times. There's probably a way to set up these events just once somewhere else and call them here, but I'm
    //not sure how to do that. -Matthew
    delete require.cache[require.resolve('bionode-vcf')];
    var vcf = require('bionode-vcf');
    vcf.readStream(s)
    //vcf.readStream(s);
    var vcfObj = new Map();
    vcf.on('data', function (vcfLine) {
        vcfObj = sharedCode.addLineToVcfObj(vcfObj, vcfLine)
    })
    vcf.on('error', function (err) {
        //TODO how can we make this error stop the rest of the vcf parse process? Save time here! Currently, the error return does nothing.
        console.error("Not a vcf file", err)
        return err;
    })

    return new Promise(function (resolve, reject) {
        vcf.on('end', function () {
            resolve(vcfObj);
        });
    });
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

/** 
 * Receives a vcf's fileContents, a diseaseArray, and a string representing the studyType ("high impact", "largest cohort", or "") 
 * and calculates a score obj to send to the browser. First, it parses the fileContents into a vcfObj, then gets a tableRowsObj
 * and finally calculates the score object which is sent to the browser as an array of jsons (the first json representing useful data 
 * for all of the calculations and the rest of the jsons representing scores for each disease for each individual)
 */
app.get('/calculate_score/', async function (req, res) {
    //TODO is this necessary? allows browsers to accept incoming data otherwise prevented by the CORS policy (https://wanago.io/2018/11/05/cors-cross-origin-resource-sharing/)
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        var vcfObj = await parseVCFToObj(req.query.fileContents);
        if (vcfObj == undefined || vcfObj.size <= 0) {
            throw new Error("The file uploaded was not a valid vcf file. Please check your file and try again.");
        }
    }
    catch (err) {
        res.status(500).send(err.message);
        return;
    }
    var diseaseStudyMapArray = sharedCode.makeDiseaseStudyMapArray(req.query.diseaseArray, req.query.studyType);
    var pValue = req.query.pValue;
    var refGen = req.query.refGen;
    var tableObj = JSON.parse("[{\"disease\":\"als\",\"studiesRows\":[{\"study\":\"Ahmeti KB 2012\",\"rows\":[{\"pos\":\"18:25531891\",\"snp\":\"rs11082762\",\"riskAllele\":\"A\",\"pValue\":7e-7,\"oddsRatio\":1.16},{\"pos\":\"19:17780880\",\"snp\":\"rs12608932\",\"riskAllele\":\"C\",\"pValue\":5e-8,\"oddsRatio\":1.37},{\"pos\":\"15:72496745\",\"snp\":\"rs1971791\",\"riskAllele\":\"G\",\"pValue\":0.000001,\"oddsRatio\":1.26},{\"pos\":\"2:218972341\",\"snp\":\"rs2303565\",\"riskAllele\":\"C\",\"pValue\":6e-7,\"oddsRatio\":1.17},{\"pos\":\"9:27553283\",\"snp\":\"rs3849942\",\"riskAllele\":\"A\",\"pValue\":4e-7,\"oddsRatio\":1.21},{\"pos\":\"8:141971128\",\"snp\":\"rs4917300\",\"riskAllele\":\"T\",\"pValue\":0.000002,\"oddsRatio\":1.27},{\"pos\":\"17:16401977\",\"snp\":\"rs7477\",\"riskAllele\":\"T\",\"pValue\":3e-7,\"oddsRatio\":1.3},{\"pos\":\"2:218706129\",\"snp\":\"rs7607369\",\"riskAllele\":\"A\",\"pValue\":0.000007,\"oddsRatio\":1.15},{\"pos\":\"16:86501641\",\"snp\":\"rs8056742\",\"riskAllele\":\"C\",\"pValue\":5e-7,\"oddsRatio\":1.27},{\"pos\":\"13:45336038\",\"snp\":\"rs9533799\",\"riskAllele\":\"A\",\"pValue\":0.000004,\"oddsRatio\":1.17}]}]}]") //await getValidTableRowsObj(pValue, refGen, diseaseStudyMapArray);
    try {
        var jsons = sharedCode.calculateScore(tableObj, vcfObj, pValue)
        res.send(jsons);
    }
    catch (err) {
        res.status(500).send(err.message)
    }
});

/**
 * Returns a list of diseaseRow objects, each of which contain a disease name and a list of its corresponding studiesRows objects. 
 * Each studyRow object contains a study name and its corresponding rows in the disease table with the given p-value.
 * See calculate_score.js for the code that calls this function.
 */
app.get('/study_table/', async function (req, res) {
    //TODO is this necessary? allows browsers to accept incoming data otherwise prevented by the CORS policy (https://wanago.io/2018/11/05/cors-cross-origin-resource-sharing/)
    res.setHeader('Access-Control-Allow-Origin', '*');
    //an array of diseases mapped to lists of studies asociated with each disease (most often it is one disease to a list of one study)
    var diseaseArray = req.query.diseaseArray
    if (diseaseArray == undefined) {
        diseaseArray = []
    }
    else if (diseaseArray.constructor !== Array) {
        diseaseArray = [diseaseArray];
    }
    var diseaseStudyMapArray = sharedCode.makeDiseaseStudyMapArray(diseaseArray, req.query.studyType);
    var pValue = req.query.pValue;
    var refGen = req.query.refGen;

    var diseaseRows = JSON.parse("[{\"disease\":\"als\",\"studiesRows\":[{\"study\":\"Ahmeti KB 2012\",\"rows\":[{\"pos\":\"18:25531891\",\"snp\":\"rs11082762\",\"riskAllele\":\"A\",\"pValue\":7e-7,\"oddsRatio\":1.16},{\"pos\":\"19:17780880\",\"snp\":\"rs12608932\",\"riskAllele\":\"C\",\"pValue\":5e-8,\"oddsRatio\":1.37},{\"pos\":\"15:72496745\",\"snp\":\"rs1971791\",\"riskAllele\":\"G\",\"pValue\":0.000001,\"oddsRatio\":1.26},{\"pos\":\"2:218972341\",\"snp\":\"rs2303565\",\"riskAllele\":\"C\",\"pValue\":6e-7,\"oddsRatio\":1.17},{\"pos\":\"9:27553283\",\"snp\":\"rs3849942\",\"riskAllele\":\"A\",\"pValue\":4e-7,\"oddsRatio\":1.21},{\"pos\":\"8:141971128\",\"snp\":\"rs4917300\",\"riskAllele\":\"T\",\"pValue\":0.000002,\"oddsRatio\":1.27},{\"pos\":\"17:16401977\",\"snp\":\"rs7477\",\"riskAllele\":\"T\",\"pValue\":3e-7,\"oddsRatio\":1.3},{\"pos\":\"2:218706129\",\"snp\":\"rs7607369\",\"riskAllele\":\"A\",\"pValue\":0.000007,\"oddsRatio\":1.15},{\"pos\":\"16:86501641\",\"snp\":\"rs8056742\",\"riskAllele\":\"C\",\"pValue\":5e-7,\"oddsRatio\":1.27},{\"pos\":\"13:45336038\",\"snp\":\"rs9533799\",\"riskAllele\":\"A\",\"pValue\":0.000004,\"oddsRatio\":1.17}]}]}]") //await getValidTableRowsObj(pValue, refGen, diseaseStudyMapArray)
    res.send(diseaseRows);
});

/**
 * Gets the diseaseRows object, but includes the setup of the sequelize objects.
 * @param {*} pValue 
 * @param {*} diseaseStudyMapArray
 * @return a diseaseRows object. See "getDiseaseRows" function for details.
 */
async function getValidTableRowsObj(pValue, refGen, diseaseStudyMapArray) {
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
            var diseaseRows = await getDiseaseRows(sequelize, pValue, refGen, diseaseStudyMapArray);
            return diseaseRows;
        });
}

/**
 * Returns a list of objects, each of which contains a disease name from the diseaseStudyMapArray 
 * and a list of corresponding studyRow objects from the given table.
 * @param {*} sequelize 
 * @param {*} pValue 
 * @param {*} diseaseStudyMapArray 
 * @return a diseaseRows object: a list of objects containing disease names and studyRow objects
 */
async function getDiseaseRows(sequelize, pValue, refGen, diseaseStudyMapArray) {
    var diseaseRows = [];
    //for each disease, get it's table from the database 
    for (var i = 0; i < diseaseStudyMapArray.length; ++i) {
        var disease = diseaseStudyMapArray[i].disease;
        var studiesArray = diseaseStudyMapArray[i].studies;
        const Model = Sequelize.Model;
        class Table extends Model { }
        Table.init({
            // attributes
            chromosome: {
                type: Sequelize.FLOAT,
                allowNull: false,
            },
            hg38: {
                type: Sequelize.FLOAT,
                allowNull: true,
            },
            hg19: {
                type: Sequelize.FLOAT,
                allowNull: true,
            },
            hg18: {
                type: Sequelize.FLOAT,
                allowNull: true,
            },
            hg17: {
                type: Sequelize.FLOAT,
                allowNull: true,
            },
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
        var studiesRows = await getStudiesRows(pValue, refGen, studiesArray, Table)
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
async function getStudiesRows(pValue, refGen, studiesArray, table) {
    var studiesRows = [];
    for (var i = 0; i < studiesArray.length; ++i) {
        var study = studiesArray[i];
        var rows = await getRows(pValue, refGen, study, table);
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
async function getRows(pValue, refGen, study, table) {
    const Op = Sequelize.Op;
    var tableRows = [];
    //first find the valid results from the table (tests for valid p-value and study)
    tableRows.push(table.findAll({
        attributes: ['chromosome', refGen, 'snp', 'riskAllele', 'pValue', 'oddsRatio'],
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
            //TODO
            var row = {
                pos: tableRow.chromosome.toString().concat(":", tableRow[refGen]), //TODO this is a problem! How do I access the variable with refGen name?
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
