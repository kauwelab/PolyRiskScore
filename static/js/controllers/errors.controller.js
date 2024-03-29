const path = require("path")
const fs = require("fs");
const countdownPath = path.join(__dirname, '../..', 'errorFiles', `countdownToNotification.txt`)

exports.sendError = (req, res) => {
    // platform options --> website, cli
    countdownToNotification = getCountdownNumber()
    platform = req.body.platform.toLowerCase()
    error = req.body.error
    date = req.body.date
    lineToAppend = [date, error + '\n'].join('\t')
    uploadPath = path.join(__dirname, '../..', 'errorFiles', `${platform}_errors.tsv`)

    fs.appendFile(uploadPath, lineToAppend, { flag: 'a+' }, err => {
        if (err) {
            console.error(err)
            return
        }
        countdownToNotification -= 1
        if (countdownToNotification <= 0) {
            countdownToNotification = 10
            console.log("Reset error countdown")
            sendNotification()
        }
        setCountdownNumber(countdownToNotification.toString())
        res.status(200).send("OK");
    })
}

exports.downloadErrors = (req, res) => {
    platform = req.query.platform.toLowerCase()

    downloadPath = path.join(__dirname, '../..', 'errorFiles')
    var options = { 
        root: downloadPath
    };
    var fileName = `${platform}_errors.tsv`; 
    res.sendFile(fileName, options, function (err) { 
        if (err) { 
            console.log(err); 
            res.status(500).send({
                message: "Error finding file"
            });
        } else { 
            console.log('Sent:', fileName); 
        } 
    });
    
}

function sendNotification() {
    //TODO this function should send a notification to the lab that we have accumulated 10 more reported errors
    // This will be something that needs to be handled in the future
    return
}

function getCountdownNumber() {
    return fs.readFileSync(countdownPath, function(err, data) {}).toString('utf-8')
}

function setCountdownNumber(number) {
    fs.writeFile(countdownPath, number, function (err) {
        if (err) throw err;
    });
}
