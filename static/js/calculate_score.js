const formatter = require('./formatHelper')

var resultJSON = "";
//TODO gzip and zip still need work
var validExtensions = ["vcf", "gzip", "zip"]
var traitObjects = []
var studyObjects = [] //holds the study object so that their additional data (ethnicity, cohort, ect) can be accessed
var traitsList = []
var selectedStudies = []

function getTraits() {
    $.ajax({
        type: "GET",
        url: "get_traits",
        success: async function (data) {
            traitObjects = data;
            traitsList = Object.getOwnPropertyNames(traitObjects)            
            
            //populate the dropdown
            var selector = document.getElementById("traitSelect");
            for (i=0; i<traitsList.length; i++) {
                var opt = document.createElement('option')
                    opt.appendChild(document.createTextNode(traitsList[i]))
                    opt.value = traitsList[i]
                    selector.appendChild(opt);
            }
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the traits: ${XMLHttpRequest.responseText}`);
        }
    })
}

function getStudies() { 
    //gets the disease name from the drop down list
    var diseaseSelectElement = document.getElementById("disease");
    var selectedTrait = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].value;
    var selector = document.getElementById("diseaseStudy");

    // clear studies that are already there
    while (selector.firstChild) {
        selector.removeChild(selector.lastChild)
    }

    // make sure we keep the --Study--
    var opt = document.createElement('option')
    opt.appendChild(document.createTextNode("--Study--"))
    opt.value = ""
    selector.appendChild(opt);

    //var selectedTrait = traitList[0] // TODO to Ed - this needs to be filled correctly, not sure how (Maddy)
    if (selectedTrait == "") {
        // do nothing
    }
    else if (selectedTrait.toLowerCase() == "all") {
        selectedTrait = traitsList
        studyTypes = ["All", "Largest Cohort", "High Impact"]

        for (i=0; i<studyTypes.length; i++) {
            var opt = document.createElement('option')
            opt.appendChild(document.createTextNode(studyTypes[i]))
            opt.value = studyTypes[i]
            selector.appendChild(opt);
        }
    }
    else {
        sIds = traitObjects[selectedTrait].studyIDs
        $.ajax({
            type: "GET",
            url: "/get_studies",
            data: {studyIDs: sIds},
            success: async function (data) {
                studyObjects = data;

                //populate the dropdown
                for (i=0; i<studyObjects.length; i++) {
                    var opt = document.createElement('option')
                    opt.appendChild(document.createTextNode(studyObjects[i].citation))
                    opt.value = studyObjects[i].studyID
                    selector.appendChild(opt);
                }
            },
            error: function (XMLHttpRequest) {
                alert(`There was an error loading the studies: ${XMLHttpRequest.responseText}`);
            }
        })
    }
}

// ------------------ Functions for retrieving associaitons ------------------------------
function getAllAssociations (pValue, refGen) {
    var formattedTraits = traitsList 

    for (i = 0; i < formattedTraits.length; i++) {
        formattedTraits[i] = formatForTableName(formattedTraits[i]) 
    }

    $.ajax({
        type: "GET",
        url: "/all_associations",
        data: {traits: formattedTraits, pValue: pValue, refGen: refGen},
        success: async function (data) {
            //TODO write
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error retrieving required associations: ${XMLHttpRequest.responseText}`);
        }
    })
}

function getSelectStudyAssociationsByTraits(pValue, refGen) {
    var trait = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].value;
    trait = formatter.formatForTableName(trait);
    var studyIDs = selectedStudies;

    $.ajax({
        type: "GET",
        url: "/get_associations",
        data: {trait: trait, studyIDs: studyIDs, pValue: pValue, refGen: refGen},
        success: async function (data) {
            //TODO write
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error retrieving required associations: ${XMLHttpRequest.responseText}`);
        }
    })
}

// ------------------- END functions for retrieving associations --------------------------

//called when the user clicks the "Caculate Risk Scores" button on the calculation page
var calculatePolyScore = async () => {
    document.getElementById('resultsDisplay').style.display = 'block';
    //user feedback while they are waiting for their score
    $('#response').html("Calculating. Please wait...");

    //get ethnicity
    var ethnicityNodes = document.querySelectorAll('#ethnicitySelect :checked')
    var ethnicityArray = [...ethnicityNodes].map(option => option.value);

    // get value of selected 'pvalue' from the 'pvalInput' form
    var pValueScalar = document.getElementById('pValScalarIn').value;
    var pValMagnitute = -1 * document.getElementById('pValMagIn').value;
    var pValue = pValueScalar.concat("e".concat(pValMagnitute))

    //gets the disease name from the drop down list
    var diseaseSelectElement = document.getElementById("disease");
    var diseaseSelected = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].value;

    //create a disease array (usually just the one disease unless "All dieases" is selected)
    var diseaseArray = makeDiseaseArray(diseaseSelected);

    //gets the study name from the drop down list
    //TODO!!!! - this will need to be adapted to allow for multiple
    var studySelectElement = document.getElementById("diseaseStudy");
    var study = studySelectElement.options[studySelectElement.selectedIndex].value

    //if the user doesn't specify a disease or study, prompt them to do so
    if (diseaseSelected === "--Disease--" || study === "--Study--") {
        $('#response').html('Please specify a specific disease and study using the drop down menus above.');
        return;
    }

    //get the reference genome to be used
    var refGenElement = document.getElementById("refGenome");
    var refGen = refGenElement.options[refGenElement.selectedIndex].value
    if (refGen == "default") {
        $('#response').html('Please select the reference genome corresponding to your file.');
        return;
    }

    //get user SNPs
    var vcfFile = document.getElementById("files").files[0];

    //if in text input mode
    if (document.getElementById('textInputButton').checked) {
        var textArea = document.getElementById('input');

        //if text input is empty, return error
        if (!textArea.value) {
            $('#response').html("Please input an rs id accoding to the procedures above or import a vcf file using the \"Choose File\" button above.");
            return;
        }

        var arrayOfInputtedSnps = textArea.value.split(/[\s|\n|,]+/);
        var snpsObj = new Map();
        for (var i = 0; i < arrayOfInputtedSnps.length; ++i) {
            snp = arrayOfInputtedSnps[i]
            //snp entry is split into two elements, the snpid (0) and the alleles (1)
            snpArray = snp.split(':');
            //if the snpid is invalid, return error
            if (!snpArray[0].toLowerCase().startsWith("rs") || isNaN(snpArray[0].substring(2, snpArray[0].length))) {
                $('#response').html("Invalid snp id " + snpArray[0] + " Each id should start with \"rs\" followed by a string of numbers.");
                return;
            }
            //if the snp entry doesn't have alleles, create a snpsObj with an empty list
            if (snpArray.length < 2) {
                snpsObj.set(snpArray[0], [])
            }
            else {
                //get the alleles in list form
                var alleles = snpArray[1].split("");
                //if more than 2 alleles, return error
                if (alleles.length > 2) {
                    $('#response').html("Too many alleles for " + snp + ". Each snp should have a maximum of two alleles.");
                    return;
                }
                for (var i = 0; i < alleles.length; ++i) {
                    //if any allele is not  A, T, G, or C, return error
                    if (["A", "T", "G", "C"].indexOf(alleles[i].toUpperCase()) < 0) {
                        $('#response').html("Allele \"" + alleles[i] + "\" is invalid. Must be A, T, G, or C.");
                        return;
                    }
                }
                snpsObj.set(snpArray[0], alleles)
            }
        }
        ClientCalculateScoreTxtInput(snpsObj, diseaseArray, study, pValue, refGen)
    }
    else {
        var extension = vcfFile.name.split(".").pop();
        if (!validExtensions.includes(extension.toLowerCase())) {
            //if here, the user uploded a file with an invalid format
            $('#response').html("Invalid file format. Check that your file is a vcf, gzip, or zip file and try again.");
            return;
        }
        ClientCalculateScore(vcfFile, extension, diseaseArray, study, pValue, refGen);
    }
}

/**
 * Resets resultJSON
 */
function resetOutput() {
    resultJSON = "";
}

// /**
//  * Gets whether the study is high impact, largest cohort, or none and returns a string to represent it.
//  * Used to determine what the studyType will be, which is used for producing the diseaseStudyMapArray server side.
//  * @param {*} study
//  */
// function getStudyTypeFromStudy(study) {
//     if (study.toLowerCase().includes("high impact")) {
//         return "high impact";
//     }
//     else if (study.toLowerCase().includes("largest cohort")) {
//         return "largest cohort";
//     }
//     return "all";
// }

//textSnps is a map of positions and alleles
var ClientCalculateScoreTxtInput = async (textSnps, diseaseArray, studyTypeList, pValue, refGen) => {
    $.ajax({
        type: "GET",
        url: "study_table",
        data: { diseaseArray: diseaseArray, studyTypeList: studyTypeList, pValue: pValue, refGen: refGen },
        success: async function (studyTableRows) {
            var tableObj = studyTableRows;

            var usefulSNPs = sharedCode.getIdentifierMap(tableObj, false);
            var textSnpsMatched = textSnps;
            for (const key of textSnps.keys()) {
                if (!usefulSNPs.has(key)) {
                    textSnpsMatched.delete(key)
                }
            }

            try {
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

/**
 * Calculates scores client side for the file input from the user
 * @param {*} vcfFile- the file input by the user
 * @param {*} extension- the extension of the file input from the user
 * @param {*} diseaseArray- the traits the user has chosen to do calculations for
 * @param {*} studyTypeList- the types of studies to do calculations for 
 *                              (high impact, large cohort, all studies [if blank]) TODO- soon to be obsolete
 * @param {*} pValue- the pvalue cutoff for scores
 * @param {*} refGen- the reference genome for which to calculate scores
 * No return- prints the simplified scores result onto the webpage
 */
var ClientCalculateScore = async (vcfFile, extension, diseaseArray, studyTypeList, pValue, refGen) => {
    var vcfObj;
    //use ajax to query the server for a tableObject of database information using the given parameters
    $.ajax({
        type: "GET",
        url: "study_table",
        data: { diseaseArray: diseaseArray, studyTypeList: studyTypeList, pValue: pValue, refGen: refGen },
        success: async function (studyTableRows) {
            var tableObj = studyTableRows;
            //Gets a map of pos/snp -> {snp, pos, oddsRatio, allele, study, disease}
            var usefulPos = sharedCode.getIdentifierMap(tableObj, true);
            try {
                //greps the vcf file, removing snps not in the database table object returned
                vcfLines = await shrinkFile(vcfFile, usefulPos)
                //converts the vcf lines into an object that can be parsed
                vcfObj = vcf_parser.getVCFObj(vcfLines);
            }
            catch (err) {
                $('#response').html(getErrorMessage(err));
                return;
            }
            try {
                var result = sharedCode.calculateScore(tableObj, vcfObj, pValue, usefulPos);
                //shortens the result for website desplay
                outputVal = getSimpleOutput(result)
                $('#response').html(outputVal);
                //saves the full result on currently open session of the website for further modifications 
                resultJSON = result;
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
    if (resultJsonObj.length <= 3) {
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
        return line[0] === '#' || usefulPos.has(getPosFromLine(line));
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
function makeDiseaseArray(trait) {
    if (disease.toLowerCase() == "all") {
        //all returns all of the traits
        return traits;
    }
    return [trait];
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
                    "," + studyResult.chromPositionsIncluded.join(";") +
                    "," + studyResult.snpsIncluded.join(";");
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
    document.getElementById("download-bar").style.visibility = "visible";
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
            level: 5
        }
    })
        .then(function (content) {
            // see FileSaver.js
            saveAs(content, filename + ".zip");
            document.getElementById("download-bar").style.visibility = "hidden";
        });

    /*
    var element = document.createElement('a');

    var dataBlob = new Blob([text], { type: "text/plain" });
    var objUrl = URL.createObjectURL(dataBlob);

    element.href = objUrl;
    element.download = filename;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();

    document.body.removeChild(element);
    */
}

// Used for creating a new FileList in a round-about way- found at https://stackoverflow.com/questions/52078853/is-it-possible-to-update-filelist/52079109
//see exampleInput for usage
function FileListItem(a) {
    a = [].slice.call(Array.isArray(a) ? a : arguments)
    for (var c, b = c = a.length, d = !0; b-- && d;) d = a[b] instanceof File
    if (!d) throw new TypeError("expected argument to FileList is File or array of File objects")
    for (b = (new ClipboardEvent("")).clipboardData || new DataTransfer; c--;) b.items.add(a[c])
    return b.files
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
    var parts = [
        new Blob([result], { type: 'text/plain' }),
        new Uint16Array([33])
    ];

    // Construct a file
    var file = new File(parts, 'example.vcf', {
        lastModified: new Date(0), // optional - default = now
        type: "overide/mimetype" // optional - default = ''
    });
    document.getElementById("files").files = new FileListItem(file);
    document.getElementById('input').value = (result);
    document.getElementById('input').setAttribute("wrap", "soft");
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

function changePValScalar() {
    $("#pvalScalar").html($("#pValScalarIn").val());
    resetOutput()
    $('#response').html("");
}

function changePValMagnitude() {
    $("#pvalMagnigtude").html(-1 * $("#pValMagIn").val());
    resetOutput()
    $('#response').html("");
}