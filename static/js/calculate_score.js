

// requirejs(['bionode-vcf'],
// function(bio_vcf) {
//     console.log(bio_vcf); 
//     //foo and bar are loaded according to requirejs
//     //config, but if not found, then node's require
//     //is used to load the module.
// });
function calculatePolyScore(){
    var testMessage = new VCFParser(); 
    var fileString = document.getElementsByName("input")[0].value;
    testMessage.parseStream(fileString, "vcf"); 
}

function SubmitFormData() {
    $('#response').html("Calculating. Please wait...")
    //file should already be read into the input box at this point
    var fileString = document.getElementsByName("input")[0].value;
    if (fileString === undefined || fileString === "") {
        //if here, the vcf file was not read properly- shouldn't ever happen
        $('#response').html("Please import a vcf file using the \"Choose File\" button above.");
    }
    else {
        // get value of selected 'pvalue' radio button in 'radioButtons'
        var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
        //gets the disease name from the drop down list
        var diseaseSelectElement = document.getElementById("disease");
        var disease = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].text;
        //gets the study name from the drop down list
        var studySelectElement = document.getElementById("diseaseStudy");
        var study = studySelectElement.options[studySelectElement.selectedIndex].text
        //if the user doesn't specify a disease or study, prompt them to do so
        if (disease === "--Disease--" || study === "--Study--") {
            $('#response').html('Please specify a specific disease and study using the drop down menus above.');
        }
        else {
            var diseaseStudyMapArray = makeDiseaseStudyMapArray(disease, study)
            //TODO insert vcf parser here and set vcfObj to it's return value
            var vcfObj = parseVCF();
            var diseaseStudyMapArray = JSON.stringify(diseaseStudyMapArray);
            $.get("study_table", { /*diseases: diseases, studies: studies*/diseaseStudyMapArray, pValue: pValue },
                function (studyTableRows) {
                    var rowsObj = JSON.parse(studyTableRows);

                    var result = calculateScore(rowsObj, vcfObj, pValue);
                    setResultOutput(result);
                }, "html").fail(function (jqXHR) {
                    $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
                });
            /*TODO previous calculate_score code- use this when file is small? makes the server do the calculations
             $.get("/calculate_score", { fileString: fileString, pValue: pValue, disease: disease, study: study },
                 function (data) {
                     debugger;
                     //data contains the info received by going to "/calculate_score"
                     sessionStorage.setItem('riskResults', data);
                     setResultOutput(data);
                 }, "html").fail(function (jqXHR) {
                     $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
                 });
             */
        }
    }
}

/**
 * Returns and array of objects corresponding to the selected disease(s) and study(ies).
 * @param {*} disease 
 * @param {*} study 
 * @return an array of objects containing diseases and their corresponding studies. 
 */
function makeDiseaseStudyMapArray(disease, study) {
    var diseaseStudyMapArray = [];
    if (disease == "All Diseases") {
        //TODO add diseases here! Need a more smooth way to do it so we don't have to constantly redo this list
        var alsStudies = [];
        var adStudies = [];

        if (study.includes("Largest Cohort")) {
            adStudies.push("Lambert et al., 2013");
            alsStudies.push("van Rheenen W, 2016");
        }
        else if (study.includes("High impact")) {
            adStudies.push("Lambert et al., 2013");
            alsStudies.push("van Rheenen W, 2016");
        }
        var alsStudyMap = {
            disease: "ALS",
            studies: alsStudies
        }
        diseaseStudyMapArray.push(alsStudyMap);
        var adStudyMap = {
            disease: "Alzheimer's disease",
            studies: adStudies
        }
        diseaseStudyMapArray.push(adStudyMap);
    }
    else {
        if (study.includes("(Largest Cohort)")) {
            study = trimWhitespace(study.replace("(Largest Cohort)", ""));
        }
        else if (study.includes("(High impact)")) {
            study = trimWhitespace(study.replace("(High impact)", ""));
        }
        var diseaseStudyMap = {
            disease: disease,
            studies: [study]
        }
        diseaseStudyMapArray.push(diseaseStudyMap);
    }
    return diseaseStudyMapArray;
}

/**
 * TODO temporary. Creates sample vcfObject and returns it.
 */
function parseVCF() {
    var vcfObj = new Map();
    var entry1 = new Map();
    entry1.set("rs6656401", ["G", "A"]);
    entry1.set("rs11771145", ["G", "G"]);
    entry1.set("rs3865444", ["C", "A"]);
    vcfObj.set("SAMP001", entry1);
    var entry2 = new Map();
    entry2.set("rs6656401", ["G", "G"]);
    entry2.set("rs11771145", ["G", "G"]);
    entry2.set("rs3865444", ["C", "A"]);
    vcfObj.set("SAMP002", entry2)
    return vcfObj;
}

/**
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

/**
 * Returns the combined odds ratio of the odds ratios in the ORs array parameter.
 * The formula is e^(ln(OR0) + ... + ln(ORn)) where n is the index of the last odds ratio in ORs
 * @param {*} ORs 
 * @return the combined odds ratio
 */
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

function formatText(jsonObject) {
    var returnText = "P Value Cutoff: " + jsonObject[0].pValueCutoff +
        " &#13;&#10Total Variants In File: " + jsonObject[0].totalVariants + " ";

    //iterate through the list of people and print them each out seperately.
    for (var i = 0; i < jsonObject.length; ++i) {
        if (i == 0) {
            continue;
        }

        returnText += "&#13;&#10Individual Name: " + jsonObject[i].individualName;
        jsonObject[i].diseaseResults.forEach(function (diseaseResult) {
            returnText += " &#13;&#10  Disease: " + diseaseResult.disease;
            diseaseResult.studyResults.forEach(function (studyResult) {
                returnText +=
                    " &#13;&#10    Study: " + studyResult.study +
                    " &#13;&#10      Odds Ratio: " + studyResult.oddsRatio +
                    " &#13;&#10      Percentile: " + studyResult.percentile +
                    " &#13;&#10      # Variants In OR: " + studyResult.numVariantsIncluded +
                    " &#13;&#10      Variants In OR: " + studyResult.variantsIncluded;
            });
        });
    }

    return returnText;
}

function formatCSV(jsonObject) {
    //Look for a csv writer npm module
    var returnText = "Individual Name, Disease, Study, Odds Ratio, Percentile, # Variants in OR, Variants in OR";

    for (var i = 0; i < jsonObject.length; ++i) {
        if (i == 0) {
            continue;
        }

        jsonObject[i].diseaseResults.forEach(function (diseaseResult) {

            diseaseResult.studyResults.forEach(function (studyResult) {
                returnText +=
                    "&#13;&#10" + jsonObject[i].individualName +
                    "," + diseaseResult.disease +
                    "," + studyResult.study +
                    "," + studyResult.oddsRatio +
                    "," + studyResult.percentile +
                    "," + studyResult.numVariantsIncluded +
                    "," + studyResult.variantsIncluded;
            });
        });
    }
    var pattern = new RegExp("2016");
    returnText.replace(pattern, "HELLO");
    return returnText;
}

function changeFormat() {
    if (!sessionStorage.getItem("riskResults")) {
        return
    }

    var data = sessionStorage.getItem("riskResults");
    setResultOutput(data);
}

function setResultOutput(data) {
    var jsonObject = JSON.parse(data);
    var outputVal = "";
    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;

    if (format === "text")
        outputVal += formatText(jsonObject);
    else if (format === "csv")
        outputVal += formatCSV(jsonObject);
    else if (format === "json")
        outputVal += data;
    else
        outputVal += "Please select a valid format."

    $('#response').html(outputVal);
}

function downloadResults() {
    var resultText = document.getElementById("response").value;
    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;
    // $.post("/download_results", {resultText : resultText, fileFormat : format},
    // function(){
    //     //Not sure what this function needs to do right now...
    // })
    var fileName = "polyscore_" + getRandomInt(100000000);
    if (format === "csv") {
        fileName += ".csv";
    }
    else {
        fileName += ".txt";
    }
    download(fileName, resultText);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

//Outputs some file information when the user selects a file. 
function handleFileSelect(evt) {
    sessionStorage.removeItem("riskResults"); 
    $('#response').html("");
    var f = evt.target.files[0]; // FileList object
    var output = [];
    output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
        f.size, ' bytes, last modified: ',
        f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
        '</li>');
    var reader = new FileReader();
    reader.readAsText(f);
    reader.onload = (function (theFile) {
        //TODO: If the file is really large, make a queue
        vcfText = reader.result;
        //reads the file into the input text box
        $('#input').html(vcfText);
    })
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function exampleInput() {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', "ad_test.vcf", false);
    xmlhttp.send();
    if (xmlhttp.status==200) {
        result = xmlhttp.responseText;
    }
    document.getElementById('input').value=(result);

    document.getElementById('input').setAttribute("wrap", "soft");
}

function exampleOutput() {
    var result1 = null;
    var xmlhttp1 = new XMLHttpRequest();
    xmlhttp1.open('GET', "ad_test.vcf", false);
    xmlhttp1.send();
    if (xmlhttp1.status==200) {
        result1 = xmlhttp1.responseText;
    }
    document.getElementById('input').value=(result1);
    document.getElementById('input').setAttribute("wrap", "soft");

    var result2 = null;
    var xmlhttp2 = new XMLHttpRequest();
    xmlhttp2.open('GET', "ad_output.txt", false);
    xmlhttp2.send();
    if (xmlhttp2.status==200) {
        result2 = xmlhttp2.responseText;
    }
    document.getElementById('response').value=(result2);


}