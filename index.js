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
var mysql = require('mysql')
//the shared code module between the browser and server
const sharedCode = require('./static/js/sharedCode')


//Define the port for app to listen on
const port = 3000

//Test code for MySQL
// var con = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "H3e6r2m1tC99r4b5c32rr56t25",
//     database: "polyscore"
//   });

//   con.connect(function(err) {
//     if (err) throw err;
//     console.log("Connected to MySQL!");
//     con.query("SELECT * FROM ad WHERE snp = 'rs6656401'", function (err, result, fields) 
//         if (err) throw err;
//         //console.log(result);
//       });
//   });

// Configure multer functionalitys
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

    var tableObj = await getValidTableRowsObj(pValue, refGen, diseaseStudyMapArray)
    res.send(tableObj);
});

async function getValidTableRowsObj(pValue, refGen, diseaseStudyMapArray) {
    // config for the database
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'polyscore',
        password: '[Miller19] packet muffin waveform',
        database: 'polyscore'
    });
    return await new Promise((resolve, reject) => {
        connection.connect(async function (err) {
            if (err) throw err;
            return err ? reject(err) : resolve(await getDiseaseRows(connection, pValue, refGen, diseaseStudyMapArray));
        });
    });
}

async function getDiseaseRows(connection, pValue, refGen, diseaseStudyMapArray) {
    var diseaseRows = [];
    for (var i = 0; i < diseaseStudyMapArray.length; ++i) {
        var disease = diseaseStudyMapArray[i].disease;
        var studiesArray = diseaseStudyMapArray[i].studies;
        var studiesRows = [];
        studiesRows = await getStudiesRows(connection, pValue, refGen, studiesArray, disease);
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
async function getStudiesRows(connection, pValue, refGen, studiesArray, disease) {
    var studiesRows = [];
    for (var j = 0; j < studiesArray.length; ++j) {
        var study = studiesArray[j];
        var rows = await getRows(connection, pValue, refGen, study, disease);
        studiesRows.push({ study: study, rows: rows });
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
async function getValidRows(connection, pValue, refGen, study, disease) {
    var result = await getRows(connection, refGen, disease);
    var rows = [];
    for (var k = 0; k < result.length; ++k) {
        var row = result[k];
        if (row["study"] == study && row["pValue"] <= pValue) {
            rows.push(row);
        }
    }
    return rows;
}

async function getRows(connection, pValue, refGen, study, disease) {
    return new Promise((resolve, reject) => {
        var query = "SELECT snp, chromosome, " + refGen + ", riskAllele, pValue, oddsRatio, study FROM " + disease;
        connection.query(query, (err, result) => {
            var rows = [];
            //TODO what to do if results is undefined? CHECK FOR IT!
            for (var i = 0; i < result.length; ++i) {
                var tableRow = result[i];
                if (tableRow["study"] == study && tableRow["pValue"] <= pValue) {
                    var row = {
                        pos: tableRow.chromosome.toString().concat(":", tableRow[refGen]),
                        snp: tableRow.snp,
                        riskAllele: tableRow.riskAllele,
                        pValue: tableRow.pValue,
                        oddsRatio: tableRow.oddsRatio
                    }
                    rows.push(row);
                }
            }
            return err ? reject(err) : resolve(rows)
        });
    });
}



app.get('/get_studies/', function (req, res) {

    var studyObject0 = { reference: "number 1", articleName: "john", URL: "https://www.bountysource.com/issues/76999512-connectionerror-connection-lost-write-econnreset-when-inserting-long-string" }
    var studyObject1 = { reference: "number 2", articleName: "jacob", URL: "https://www.google.com/search?q=object.pluralize&rlz=1C1XYJR_enUS815US815&oq=object.pluralize&aqs=chrome..69i57.4710j0j7&sourceid=chrome&ie=UTF-8" }
    var studyObject2 = { reference: "number 3", articleName: "jingle", URL: "http://docs.sequelizejs.com/manual/getting-started.html" }
    var studyObject3 = { reference: "number 4", articleName: "heimer", URL: "http://docs.sequelizejs.com/manual/getting-started.html" }
    var studiesArray = []
    studiesArray.push(studyObject0)
    studiesArray.push(studyObject1)
    studiesArray.push(studyObject2)
    studiesArray.push(studyObject3)


    const sequelize = new Sequelize('studies', 'root', 'Petersme1', {
        host: 'localhost',
        dialect: 'mysql',
        dialectOptions: {
            insecureAuth: true
        },
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
    class Studies extends Model { }
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
        var studyObject = { reference: tempReference[i], articleName: tempArticleNames[i], URL: tempURL[i] }
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
