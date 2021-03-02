const Ukbbdata = require("../models/ukbbdata.model.js");

exports.getTraits = (req, res) => {
    Ukbbdata.getTraits((err, data) => {
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
                returnData.push([data[i].trait, data[i].studyID])
            }
            res.send(returnData);
        }
    })
}

exports.getStudies = (req, res) => {
    Ukbbdata.getStudies(req.query.trait, req.query.studyTypes, (err, data) => {
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

exports.getSummaryResults = (req, res) => {
    Ukbbdata.getSummaryResults(req.query.studyIDs, (err, data) => {
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
    Ukbbdata.getFullResults(req.query.studyIDs, (err, data) => {
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
