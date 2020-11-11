const Ukbbdata = require("../models/ukbbdata.model.js");

exports.getDiseases = (req, res) => {
    Ukbbdata.getDiseases((err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            //todo need to test
            returnData = []
            for (i = 0; i < data.length; i++) {
                returnData.push(data[i].disease)
            }
            res.send(returnData);
        }
    })
}

exports.getSummaryResults = (req, res) => {
    Ukbbdata.getSummaryResults(req.params.studyIDs, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    })
}

exports.getFullResults = (req, res) => {
    Ukbbdata.getFullResults(req.params.studyIDs, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    })
}
