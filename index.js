// Require all the Dependencies
const express = require('express');
const path = require('path');
const nodeMailer = require('nodemailer');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars')
const stream = require('stream');
const multer = require('multer');
const del = require('del');
const fsExtra = require('fs-extra');
var mysql = require('mysql')
//the shared code module between the browser and server
const sharedCode = require('./static/js/sharedCode')
const passwords = require('./static/js/passwords')


//Define the port for app to listen on
const port = 3000

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

// API endpoints for get requests
require("./static/js/routes/routes.js")(app);

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
            pass: passwords.getEmailPassword()
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

// end Post Routes ---------------------------------------------------------------------------------

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
}
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
