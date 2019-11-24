var resultJSON = "";
//a resetable boolean that is represented by a grayed-out button when false. Prevents the user from calculating the same
//score multiple times
var canCalculate = true;
var validExtensions = ["vcf", "gzip", "zip"]

var calculatePolyScore = async () => {
    document.getElementById('resultsDisplay').style.display = 'block';

    if (canCalculate) {
        //user feedback while they are waiting for their score
        $('#response').html("Calculating. Please wait...")
        console.log("Beginning score calculation.")

        // get value of selected 'pvalue' from 'pvalSlider'
        var pValue = getSliderPVal(document.getElementById('pvalSlider'), 'pvalue');

        //gets the disease name from the drop down list
        var diseaseSelectElement = document.getElementById("disease");
        var diseaseSelected = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].value;

        //create a disease array (usually just the one disease unless "All dieases" is selected)
        var diseaseArray = makeDiseaseArray(diseaseSelected);

        //gets the study name from the drop down list
        var studySelectElement = document.getElementById("diseaseStudy");
        var study = studySelectElement.options[studySelectElement.selectedIndex].text

        //the type of study the study is ("high impact", "largest cohort", or "")
        var studyType = getStudyTypeFromStudy(study);

        //if the user doesn't specify a disease or study, prompt them to do so
        if (diseaseSelected === "--Disease--" || study === "--Study--") {
            $('#response').html('Please specify a specific disease and study using the drop down menus above.');
            return
        }

        //get the reference genome to be used
        var refGenElement = document.getElementById("refGenome");
        var refGen = refGenElement.options[refGenElement.selectedIndex].value
        if (refGen == "default") {
            $('#response').html('Please select the reference genome corresponding to your file.');
            return
        }
        
        //get user SNPs
        var vcfFile = document.getElementById("files").files[0];
        if (!vcfFile) {
            //if here, the user did not import a vcf file or the the vcf file was not read properly
            var textArea = document.getElementById('input');

            if (!textArea.value) {
                $('#response').html("Please input an rs id accoding to the procedures above or import a vcf file using the \"Choose File\" button above.");
                return;
            }

            console.log("Using text input for SNPs")
            var arrayOfInputtedSnps = textArea.value.split(/[\s|\n|,]+/);
            var snpsObj = new Map();
            arrayOfInputtedSnps.forEach(function(snp) {
                snpArray = snp.split(':');
                if (snpArray.length < 2){
                    snpsObj.set(snpArray[0], [])
                }
                else {
                    var alleles = snpArray[1].split("");
                    if (alleles.length > 2){
                        //THIS SHOULDN'T HAPPEN! THROW AN ERROR OR SOMETHING
                        //AND GET THE HECK OUT --Maddy
                    }
                    snpsObj.set(snpArray[0], alleles)
                }
            })
            canCalculate = false;
            toggleCalculateButton(false);
            ClientCalculateScoreTxtInput(snpsObj, diseaseArray, studyType, pValue, refGen)
        }
        else {
            console.log("Using vcf file for SNPs")
            var fileSize = vcfFile.size;
            var extension = vcfFile.name.split(".").pop();
            if (!validExtensions.includes(extension.toLowerCase())) {
                //if here, the user uploded a file with an invalid format
                $('#response').html("Invalid file format. Check that your file is a vcf, gzip, or zip file and try again.");
                return;
            }
            canCalculate = false;
            toggleCalculateButton(false);
            ClientCalculateScore(vcfFile, extension, diseaseArray, studyType, pValue, refGen);
        }
    }
}

/**
 * Turns the calculate button on and off.
 * @param {*} canClick
 */
function toggleCalculateButton(canClick) {
    var button = document.getElementById("feedbackSubmit")
    button.disabled = !canClick;
    if (!canClick) {
        button.style.background = "gray";
        button.style.borderColor = "white"
    }
    else {
        button.style.background = "";
        button.style.borderColor = ""
    }
}

/**
 * Resets resultJSON and allows the user to use the calculate score button again.
 */
function resetOutput() {
    canCalculate = true;
    toggleCalculateButton(true);
    resultJSON = "";
}

/**
 * Gets whether the study is high impact, largest cohort, or none and returns a string to represent it.
 * Used to determine what the studyType will be, which is used for producing the diseaseStudyMapArray server side.
 * @param {*} study
 */
function getStudyTypeFromStudy(study) {
    if (study.toLowerCase().includes("high impact")) {
        return "high impact";
    }
    else if (study.toLowerCase().includes("largest cohort")) {
        return "largest cohort";
    }
    return "all";
}

//textSnps is a map of positions and alleles
var ClientCalculateScoreTxtInput = async (textSnps, diseaseArray, studyType, pValue, refGen) => {
    $.ajax({
        type: "GET",
        url: "study_table",
        data: { diseaseArray: diseaseArray, studyType: studyType, pValue: pValue, refGen: refGen },
        success: async function (studyTableRows) {
            var tableObj = studyTableRows;
            
            var usefulSNPs = sharedCode.getIdentifierMap(tableObj, false);
            var textSnpsMatched = textSnps;
            debugger;
            for (const key of textSnps.keys()) {
                if (!usefulSNPs.has(key)){
                    textSnpsMatched.delete(key)
                }
            }

            try {
                //TODO
                debugger;
                var result = sharedCode.calculateScoreFromText(tableObj, textSnpsMatched, pValue);
                outputVal = getSimpleOutput(result)
                $('#response').html(outputVal);
                resultJSON = result;
            }
            catch (err) {
                $('#response').html('There was an error computing the risk score:\n' + err);
            }
        },
        error: function (XMLHttpRequest) {
            $('#response').html('There was an error computing the risk score:\n' + XMLHttpRequest.responseText);
        }
    })
}

var ClientCalculateScore = async (vcfFile, extension, diseaseArray, studyType, pValue, refGen) => {
    //console.time("score in")
    var vcfObj;
    //console.time("got data in")
    $.ajax({
        type: "GET",
        url: "study_table",
        data: { diseaseArray: diseaseArray, studyType: studyType, pValue: pValue, refGen: refGen },
        success: async function (studyTableRows) {
            //console.timeEnd("got data in")
            var tableObj = studyTableRows;
            //TODO specifiy here that we want pos, not snps
            var usefulPos = sharedCode.getIdentifierMap(tableObj, true);
            try {
                //console.time("shrink")
                vcfLines = await shrinkFile(vcfFile, usefulPos)
                //console.timeEnd("shrink");
                //console.time("parse");
                vcfObj = vcf_parser.getVCFObj(vcfLines);
                //console.timeEnd("parse")
            }
            catch (err) {
                $('#response').html(getErrorMessage(err));
                return;
            }
            try {
                //console.time("calculated score in")
                var result = sharedCode.calculateScore(tableObj, vcfObj, pValue, usefulPos);
                //console.timeEnd("calculated score in")
                outputVal = getSimpleOutput(result)
                $('#response').html(outputVal);
                resultJSON = result;
                //console.timeEnd("score in")
            }
            catch (err) {
                $('#response').html(getErrorMessage(err));
            }
        },
        error: function (XMLHttpRequest) {
            $('#response').html('There was an error computing the risk score:\n' + XMLHttpRequest.responseText);
        }
    });
}

function getErrorMessage(err) {
    var response = 'There was an error computing the risk score:'
    if (err != undefined) {
        response += '\n' + err;
    }
    if (err.stack != undefined) {
        response += '\n' + err.stack;
    }
    return response;
}

/**
 * Returns a simplified output using the given json. The json is truncated and converted to the correct format.
 * Then, if a truncation occured, "Results preview:" is appended to the beginning and "..." is appended to the end.
 * @param {*} resultJsonStr
 */
function getSimpleOutput(resultJsonStr) {
    var simpleJsonStr = simplifyResultJson(resultJsonStr);
    var simpleOutput = getResultOutput(simpleJsonStr)
    if (simpleJsonStr != resultJsonStr) {
        simpleOutput = "Results preview:\n" + simpleOutput + "\n...";
    }
    return simpleOutput;
}

/**
 * Truncates the result to include the results for the first two individuals, including calculation info ("resultJsonObj[0]").
 * @param {*} resultJsonStr the large resultJson to be truncated
 */
function simplifyResultJson(resultJsonStr) {
    //TODO avoid having to parse again! -is there anyway to keep this in obj form instead of passing a string?
    var resultJsonObj = JSON.parse(resultJsonStr);
    //if the resultJson is already truncated, return it
    if (resultJsonObj.size <= 3) {
        return resultJsonStr;
    }
    //create a new array, add the first three objects from the resultJson, and return its string version
    else {
        var simpleResultObj = [];
        for (var i = 0; i < 3; ++i) {
            simpleResultObj.push(resultJsonObj[i]);
        }
        return JSON.stringify(simpleResultObj);
    }
}

/**
 * Removes all lines that don't have positions found in the tableObj. Returns a list of lines that are valid, including the header lines
 * @param {} vcfFile 
 * @param {*} usefulPos 
 */
async function shrinkFile(vcfFile, usefulPos) {
    var fileContents = await readFile(vcfFile);
    var fileLines = fileContents.split("\n");
    var fileLinesSmall = jQuery.grep(fileLines, function (line) {
        return usefulPos.has(getPosFromLine(line)) || line[0] === '#';
    });
    return fileLinesSmall;
}

/**
 * Gets chrom:pos from the line
 * @param {} line 
 */
function getPosFromLine(line) {
    var secondTab = line.indexOf('\t', line.indexOf('\t') + 1);
    return line.substr(0, secondTab).replace('\t', ':');
}

/**
 * Returns an array containing just the disease, or if the disease is "all diseases",
 * returns a list of all the diseases in the database
 * @param {*} disease
 */
function makeDiseaseArray(disease) {
    if (disease.toLowerCase() == "all") {
        //all returns nothing and all of the diseases are added to this array in makeDiseaseStudyMapArray in sharedCode.js
        return [];
    }
    return [disease];
}

function formatText(jsonObject) {
    var returnText = "P Value Cutoff: " + jsonObject[0].pValueCutoff +
        " \nTotal Variants in File: " + jsonObject[0].totalVariants + " ";

    //iterate through the list of people and print them each out seperately.
    for (var i = 0; i < jsonObject.length; ++i) {
        if (i == 0 || !jsonObject[i]) {
            continue;
        }
        returnText += "\nIndividual Name: " + jsonObject[i].individualName;
        jsonObject[i].diseaseResults.forEach(function (diseaseResult) {
            returnText += " \n  Disease: " + diseaseResult.disease;
            diseaseResult.studyResults.forEach(function (studyResult) {
                returnText +=
                    " \n    Study: " + studyResult.study +
                    " \n      Odds Ratio: " + studyResult.oddsRatio +
                    " \n      Percentile: " + studyResult.percentile +
                    " \n      # SNPs in OR: " + studyResult.numSNPsIncluded +
                    " \n      Chrom Positions in OR: " + studyResult.chromPositionsIncluded +
                    " \n      SNPs in OR: " + studyResult.snpsIncluded;
            });
        });
    }
    return returnText;
}

function formatCSV(jsonObject) {
    //TODO
    debugger;
    //Look for a csv writer npm module
    var returnText = "Individual Name, Disease, Study, Odds Ratio, Percentile, # SNPs in OR, Chrom Positions in OR, SNPs in OR";

    for (var i = 0; i < jsonObject.length; ++i) {
        if (i == 0) {
            continue;
        }

        jsonObject[i].diseaseResults.forEach(function (diseaseResult) {

            diseaseResult.studyResults.forEach(function (studyResult) {
                returnText +=
                    "\n" + jsonObject[i].individualName +
                    "," + diseaseResult.disease +
                    "," + studyResult.study +
                    "," + studyResult.oddsRatio +
                    "," + studyResult.percentile +
                    "," + studyResult.numSNPsIncluded +
                    "," + studyResult.chromPositionsIncluded +
                    "," + studyResult.snpsIncluded;
            });
        });
    }
    // var pattern = new RegExp("2016");
    // returnText.replace(pattern, "HELLO");
    return returnText;
}

function changeFormat() {
    // if (!sessionStorage.getItem("riskResults")) {
    //     return
    // }

    // var data = sessionStorage.getItem("riskResults");
    // setResultOutput(data);
    if (!resultJSON) {
        return;
    }
    var outputVal = getSimpleOutput(resultJSON);
    $('#response').html(outputVal);
}

function getResultOutput(data) {
    if (data == undefined || data == "") {
        return "";
    }
    else {
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
        return outputVal;
    }
}

function downloadResults() {
    //var resultText = document.getElementById("response").value;
    var resultText = getResultOutput(resultJSON);
    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;
    //TODO better name?
    var fileName = "polyscore_" + getRandomInt(100000000);
    var extension = "";
    if (format === "csv") {
        extension = ".csv";
    }
    else {
        extension = ".txt";
    }
    download(fileName, extension, resultText);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/**
 * This code was found here https://jsfiddle.net/ali_soltani/zsyn04qw/3/
 * Creates an invisible element on the page that contains the string to be downloaded.
 * Once the element is downloaded, it is removed. May have a size limit- not sure what it is yet.
 * @param {*} filename
 * @param {*} text
 */
function download(filename, extension, text) {
    var zip = new JSZip();
    zip.file(filename + extension, text);
    zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
            //TODO let the user know that they've downloaded the file while they are waiting
            /* compression level ranges from 1 (best speed) to 9 (best compression) */
            level: 9
        }
    })
        .then(function (content) {
            // see FileSaver.js
            saveAs(content, filename + ".zip");
        });

    var element = document.createElement('a');

    var dataBlob = new Blob([text], { type: "text/plain" });
    var objUrl = URL.createObjectURL(dataBlob);

    element.href = objUrl;
    element.download = filename;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();

    document.body.removeChild(element);
}

function exampleInput() {
    document.getElementById('fileUploadButton').click();
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', "ad_test.vcf", false);
    xmlhttp.send();
    if (xmlhttp.status == 200) {
        result = xmlhttp.responseText;
    }
    document.getElementById('input').value = (result);

    document.getElementById('input').setAttribute("wrap", "soft");
}

function exampleOutput() {
    var result1 = null;
    var xmlhttp1 = new XMLHttpRequest();
    xmlhttp1.open('GET', "ad_test.vcf", false);
    xmlhttp1.send();
    if (xmlhttp1.status == 200) {
        result1 = xmlhttp1.responseText;
    }
    document.getElementById('input').value = (result1);
    document.getElementById('input').setAttribute("wrap", "soft");

    var result2 = null;
    var xmlhttp2 = new XMLHttpRequest();
    xmlhttp2.open('GET', "ad_output.txt", false);
    xmlhttp2.send();
    if (xmlhttp2.status == 200) {
        result2 = xmlhttp2.responseText;
    }
    document.getElementById('response').value = (result2);
}

function clickTextInput() {
    var textInput = document.getElementById('input');
    textInput.value = null;
    textInput.removeAttribute('readonly');
    var browseButton = document.getElementById('file-form');
    browseButton.style.visibility = 'hidden';
}

function clickFileUpload() {
    var textInput = document.getElementById('input');
    textInput.value = null;
    textInput.setAttribute('readonly', 'readonly');
    var browseButton = document.getElementById('file-form');
    browseButton.style.visibility = 'visible';
    var previousFileText = document.getElementById('uploadText');
    if (previousFileText.value !== "") {
        document.getElementById('input').value = previousFileText.value;
    }
}