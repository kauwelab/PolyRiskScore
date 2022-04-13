const cohortdata = require("../models/cohortdata.model.js");
const path = require("path")
const fs = require("fs")

exports.getTraits = (req, res) => {
    cohortdata.getTraits((err, data) => {
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
    cohortdata.getStudies(req.query.trait, req.query.studyTypes, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // ensure that we are only returning studies for which we have data in the cohort table
            studiesFromStudyTable = data[0]
            studyDataFromCohortTable = data[1]
            studyIDsFromCohortTable = []
            studiesToReturn = []

            for (i=0; i<studyDataFromCohortTable.length; i++) {
                if (studyDataFromCohortTable[i] != []) {
                    if (Array.isArray(studyDataFromCohortTable[i])) {
                        for (j=0; j<studyDataFromCohortTable[i].length; j++) {
                            studyIDsFromCohortTable.push([studyDataFromCohortTable[i][j].studyID, studyDataFromCohortTable[i][j].trait, studyDataFromCohortTable[i][j].pValueAnnotation, studyDataFromCohortTable[i][j].betaAnnotation, studyDataFromCohortTable[i][j].ogValueTypes].join("|"))
                        }
                    } else {
                        studyIDsFromCohortTable.push([studyDataFromCohortTable[i].studyID, studyDataFromCohortTable[i].trait, studyDataFromCohortTable[i].pValueAnnotation, studyDataFromCohortTable[i].betaAnnotation, studyDataFromCohortTable[i].ogValueTypes].join("|"))
                    }
                }
            }

            for (i=0; i<studiesFromStudyTable.length; i++) {
                if (studyIDsFromCohortTable.includes([studiesFromStudyTable[i].studyID, studiesFromStudyTable[i].trait, studiesFromStudyTable[i].pValueAnnotation, studiesFromStudyTable[i].betaAnnotation, studiesFromStudyTable[i].ogValueTypes].join("|"))) {
                    studiesToReturn.push(studiesFromStudyTable[i])
                }
            }

            res.send(studiesToReturn);
        }
    })
}

exports.getCohorts = (req, res) => {
    cohortdata.getCohorts(req.query.studyID, req.query.trait, req.query.pValAnno, req.query.betaAnno, req.query.valueType, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving cohort data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            returnData = []
            for (i = 0; i < data.length; i++) {
                returnData.push(data[i].cohort.toLowerCase())
            }
            res.send(returnData);
        }
    })
}

exports.getSummaryResults = (req, res) => {
    cohortdata.getSummaryResults(req.query.studyID, req.query.trait, req.query.cohort, req.query.pValAnno, req.query.betaAnno, req.query.valueType, (err, data) => {
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
    cohortdata.getFullResults(req.query.studyID, req.query.trait, req.query.cohort, req.query.pValAnno, req.query.betaAnno, req.query.valueType, (err, data) => {
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
    cohortdata.getStudySnps(req.query.studyID, req.query.trait, req.query.cohort, req.query.pValAnno, req.query.betaAnno, req.query.valueType, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            snps = data[0]['snps'].split("|")
            res.send(snps);
        }
    })
}

exports.getPercentiles = (req, res) => {
    var studyIDObjs = req.body.studyIDObjs
    var cohort = req.body.cohort

    percentiles = {}

    cohortdata.getPercentiles(studyIDObjs, cohort, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving associations: ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            for (i=0; i<data.length; i++) {
                if (Array.isArray(data[i])) {
                    for (j=0; j<data[i].length; j++) {
                        key = [data[i][j].trait, data[i][j].pValueAnnotation, data[i][j].betaAnnotation, data[i][j].ogValueTypes, data[i][j].studyID].join("|")
                        if (!(Object.keys(percentiles).includes(key))) {
                            percentiles[key] = data[i][j]
                        }
                    }
                }
                else {
                    key=[data[i].trait, data[i].pValueAnnotation, data[i].betaAnnotation, data[i].ogValueTypes, data[i].studyID].join("|")
                    if (!(Object.keys(percentiles).includes(key))) {
                        percentiles[key] = data[i]
                    }
                }
            }
            res.send(percentiles);
        }
    });
}

exports.getLastPercentilesUpdate = (req, res) => {
    cohort = req.query.cohort

    percentilesPath = path.join(__dirname, '../..', `downloadables/preppedServerFiles/allPercentiles_${cohort}.txt`)
    statsObj = fs.statSync(percentilesPath)
    updateTime = statsObj.mtime
    res.send(`${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()}`)
}

exports.getDownloadPercentiles = (req, res) => {
    cohort = req.query.cohort
    downloadPath = path.join(__dirname, '../..', 'downloadables', 'preppedServerFiles')
    var options = { 
        root: downloadPath
    };
    var fileName = `allPercentiles_${cohort}.txt`; 
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
