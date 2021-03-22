const path = require("path")
const fs = require("fs");
countdownToNotification = 10

exports.sendError = (req, res) => {
    // platform options --> website, cli
    platform = req.body.platform.toLowerCase()
    error = req.body.error
    date = req.body.date
    lineToAppend = [date, error + '\n'].join('\t')
    uploadPath = path.join(__dirname, '../..', 'errorFiles', `${platform}_errors.tsv`)

    console.log("we are in sendError")
    
    fs.appendFile(uploadPath, lineToAppend, { flag: 'a+' }, err => {
        if (err) {
            console.error(err)
            return
        }
        console.log("we have appended to the file")
        countdownToNotification -= 1
        if (countdownToNotification <= 0) {
            countdownToNotification = 10
            sendNotification()
        }
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
    return
}

