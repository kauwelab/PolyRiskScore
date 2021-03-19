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
                returnData.push(data[i].trait)
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
            // ensure that we are only returning studies for which we have data in the ukbb table
            studiesFromStudyTable = data[0]
            studyDataFromUKBB = data[1]
            studyIDsFromUKBB = []
            studiesToReturn = []

            for (i=0; i<studyDataFromUKBB.length; i++) {
                studyIDsFromUKBB.push(studyDataFromUKBB[i].studyID)
            }

            for (i=0; i<studiesFromStudyTable.length; i++) {
                if (studyIDsFromUKBB.includes(studiesFromStudyTable[i].studyID)) {
                    studiesToReturn.push(studiesFromStudyTable[i])
                }
            }

            res.send(studiesToReturn);
        }
    })
}

exports.getSummaryResults = (req, res) => {
    Ukbbdata.getSummaryResults(req.query.studyID, req.query.trait, (err, data) => {
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
    Ukbbdata.getFullResults(req.query.studyID, req.query.trait, (err, data) => {
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

exports.getStudySnps = (req, res) => {
    Ukbbdata.getStudySnps((err, data) => {
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
