var resultJSON = "";
//TODO gzip and zip still need work
var validExtensions = ["vcf", "gzip", "zip"]
var traitObjects = []
var studyObjects = [] //holds the study object so that their additional data (ethnicity, cohort, ect) can be accessed
var traitsList = []
var selectedStudies = []
//if false, the VCF button is selected- used as a toggle to prevent action on double click
var textButtonSelected = true;

function getTraits() {
    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#traitSelect').replaceWith("<select id='traitSelect' multiple></select>");

    //call the API and populate the traits dropdown/multiselct with the results
    $.ajax({
        type: "GET",
        url: "get_traits",
        success: async function (data) {
            traitsList = data;
            var selector = document.getElementById("traitSelect");
            for (i = 0; i < traitsList.length; i++) {
                var opt = document.createElement('option')
                opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(traitsList[i])))
                opt.value = traitsList[i]
                selector.appendChild(opt);
            }
            document.multiselect('#traitSelect');
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the traits: ${XMLHttpRequest.responseText}`);
        }
    })
}

function getEthnicities() {
    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#ethnicitySelect').replaceWith("<select id='ethnicitySelect' multiple></select>");

    //call the API and populate the ethnicity dropdown/multiselct with the results
    $.ajax({
        type: "GET",
        url: "ethnicities",
        success: async function (data) {
            ethnicityList = data;
            var selector = document.getElementById("ethnicitySelect");
            for (i = 0; i < ethnicityList.length; i++) {
                var opt = document.createElement('option')
                opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(ethnicityList[i])))
                opt.value = ethnicityList[i]
                opt.selected = "selected"
                selector.appendChild(opt);
            }
            // adds an unspecified option to account for studies with a blank ethnicity column
            var opt = document.createElement('option')
            opt.appendChild(document.createTextNode("Unspecified"))
            opt.value = "unspecified"
            opt.selected = "selected"
            selector.appendChild(opt);
            document.multiselect('#ethnicitySelect');
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the ethnicities: ${XMLHttpRequest.responseText}`);
        }
    })
}

function getStudies() {
    //get the users selected traits, ethnicities, and studty types as arrays of values
    var traitNodes = document.querySelectorAll('#traitSelect :checked');
    var selectedTraits = [...traitNodes].map(option => option.value);
    var ethnicityNodes = document.querySelectorAll('#ethnicitySelect :checked');
    var selectedEthnicities = [...ethnicityNodes].map(option => option.value);
    var typeNodes = document.querySelectorAll('#studyTypeSelect :checked');
    var selectedTypes = [...typeNodes].map(option => option.value);

    if (selectedTraits.length == 0) {
        console.log("NO TRAIT SELECTED")
        alert(`No traits selected. You must select at least one trait in order to filter studies.`);
        return;
    }

    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#studySelect').replaceWith("<select id='studySelect' multiple></select>");
    var studySelector = document.getElementById("studySelect");

    //call the API and populate the study dropdown/multiselect with the results
    $.ajax({
        type: "GET",
        url: "/get_studies",
        data: { studyTypes: selectedTypes, traits: selectedTraits, ethnicities: selectedEthnicities },
        success: async function (data) {
            //data ~ {traitName:[{study},{study},{study}], traitName:[{study},{study}],...}
            var studyLists = data;
            var traits = Object.keys(data);

            if (traits.length == 0) {
                alert(`No results were found using the specified filters. Try using different filters.`)
            }
            for (i = 0; i < traits.length; i++) {
                var trait = traits[i];
                for (j = 0; j < studyLists[trait].length; j++) {
                    var study = studyLists[trait][j];
                    var opt = document.createElement('option');
                    var displayString = study.citation + ' | ' + trait + ' | ' + study.studyID;
                    opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(displayString)));
                    opt.value = study.studyID;
                    opt.setAttribute('data-trait', trait);
                    studySelector.appendChild(opt);
                }
            }

            document.multiselect('#studySelect');
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the studies: ${XMLHttpRequest.responseText}`);
        }
    })
}

//called in calculatePolyScore below, 
//queries the server for associations with the given traits, studies, pValue, and reference genome
function getSelectStudyAssociationsByTraits(traitList, pValue, refGen) {
    traitList = JSON.stringify(traitList)
    return Promise.resolve($.ajax({
        type: "GET",
        url: "/get_associations",
        data: { traits: traitList, pValue: pValue, refGen: refGen },
        success: async function (data) {
            return data;
        },
        error: function (XMLHttpRequest) {
            var errMsg = `There was an error retrieving required associations: ${XMLHttpRequest.responseText}`
            $('#response').html(errMsg);
            alert(errMsg);
        }
    }));
}

//called when the user clicks the "Caculate Risk Scores" button on the calculation page
var calculatePolyScore = async () => {
    document.getElementById('resultsDisplay').style.display = 'block';
    $('#response').html("Calculating. Please wait...");

    // get the values from the user's inputs/selections
    var vcfFile = document.getElementById("files").files[0];
    var refGenElement = document.getElementById("refGenome");
    var refGen = refGenElement.options[refGenElement.selectedIndex].value
    var ethElement = document.getElementById("LD-ethnicitySelect");
    var ethnicity = ethElement.options[ethElement.selectedIndex].value
    var traitNodes = document.querySelectorAll('#traitSelect :checked');
    var traits = [...traitNodes].map(option => option.value);
    var studyNodes = document.querySelectorAll('#studySelect :checked');
    var studies = [...studyNodes].map(option => [option.value, option.dataset.trait]);
    var pValueScalar = document.getElementById('pValScalarIn').value;
    var pValMagnitute = -1 * document.getElementById('pValMagIn').value;
    var pValue = pValueScalar.concat("e".concat(pValMagnitute));

    //if the user doesn't specify a trait, study, or reference genome, prompt them to do so
    if (studies.length === 0) {
        $('#response').html('Please specify at least one trait and study from the dropdowns above (steps 3-5).');
        return;
    }
    if (refGen == "default") {
        $('#response').html('Please select the reference genome corresponding to your file (step 2).');
        return;
    }

    //convert the studies into a list of trait-study object pairs
    var traitList = [];
    for (i = 0; i < traits.length; i++) {
        trait = traits[i];
        studyList = []
        for (j = 0; j < studies.length; j++) {
            if (studies[j][1] === trait) {
                studyList.push(studies[j][0]);
            }
        }
        traitObj = { trait: trait, studies: studyList };
        traitList.push(traitObj);
    }

    //send a get request to the server with the specified traits and studies
    associationData = await getSelectStudyAssociationsByTraits(traitList, pValue, refGen);

    //if in text input mode
    if (document.getElementById('textInputButton').checked) {
        //TODO: is it possible to refactor the next ~20 lines of code into its own function for increased readability?
        var textArea = document.getElementById('input');

        //if text input is empty, return error
        if (!textArea.value) {
            $('#response').html("Please input RS IDs by hand according to the procedures above or import a VCF file using the \"File Upload\" and then the \"Choose File\" buttons above (step 1).");
            return;
        }

        var arrayOfInputtedSnps = textArea.value.split(/[\s|\n|,]+/);
        var snpObjs = new Map();
        for (var i = 0; i < arrayOfInputtedSnps.length; ++i) {
            var snpObj;
            snp = arrayOfInputtedSnps[i]
            //snp entry is split into two elements, the snpid (0) and the alleles (1)
            snpArray = snp.split(':');
            //if the snpid is invalid, return error
            if (!snpArray[0].toLowerCase().startsWith("rs") || isNaN(snpArray[0].substring(2, snpArray[0].length))) {
                $('#response').html("Invalid SNP id \"" + snpArray[0] + "\". Each ID should start with \"rs\" followed by a string of numbers.");
                return;
            }
            if (snpArray.length > 2) {
                $('#response').html("Invalid SNP \"" + snp + "\". Each SNP entry should only contain one colon.");
                return;
            }
            else if (snpArray.length == 2) {
                //get the alleles in list form
                var alleleArray = snpArray[1].split("");
                //if more than 2 alleles, return error
                if (alleleArray.length > 2) {
                    $('#response').html("Too many alleles for \"" + snp + "\". Each SNP should have a maximum of two alleles.");
                    return;
                }
                for (var j = 0; j < alleleArray.length; ++j) {
                    //if any allele is not  A, T, G, or C, return error
                    if (["A", "T", "G", "C"].indexOf(alleleArray[j].toUpperCase()) < 0) {
                        $('#response').html("Allele \"" + alleleArray[j] + "\" is invalid. Must be A, T, G, or C.");
                        return;
                    }
                }
            }
            snpObj = {
                pos: snpArray[0],
                alleleArray: alleleArray
            }
            snpObjs.set(snpArray[0], snpObj);
        }
        ClientCalculateScore(snpObjs, associationData, pValue, false);
    }
    else {
        //if text input is empty, return error
        if (typeof vcfFile === "undefined") {
            $('#response').html("Please import a VCF file using the \"Choose File\" button above or input RS IDs by hand using the \"Text input\" button above (step 1).");
            return;
        }
        else {
            var extension = vcfFile.name.split(".").pop();
            if (!validExtensions.includes(extension.toLowerCase())) {
                //if here, the user uploded a file with an invalid format
                $('#response').html("Invalid file format. Check that your file is a vcf, gzip, or zip file and try again.");
                return;
            }
            ClientCalculateScore(vcfFile, associationData, pValue, true);
        }
    }
}

/**
 * Resets resultJSON
 */
function resetOutput() {
    resultJSON = "";
}


/**
 * Calculates scores client side for the file input from the user
 * @param {*} snpsInput- the file or text input by the user (specifiying snps of interest)
 * @param {*} associationData- the associations from get_associations (specifying traits and studies for calculations)
 * @param {*} pValue- the pvalue cutoff for scores
 * @param {*} isVCF - whether the user gave us a VCF file or SNP text
 * No return- prints the simplified scores result onto the webpage
 */
var ClientCalculateScore = async (snpsInput, associationData, pValue, isVCF) => {
    //Gets a map of pos/snp -> {snp, pos, oddsRatio, allele, study, trait}
    var associMap = sharedCode.getAssociationMap(associationData, isVCF);

    //remove SNPs that aren't relevant from the snpsInput object
    var greppedSNPs;
    var totalInputVariants = 0;
    if (isVCF) {
        try {
            //greps the vcf file, removing snps not in the database table object returned
            var vcfLines = await getFileLines(snpsInput);
            totalInputVariants = getNumDatalines(vcfLines);
            var reducedVCFLines = await getGreppedFileLines(vcfLines, associMap);

            //converts the vcf lines into an object that can be parsed
            greppedSNPs = vcf_parser.getVCFObj(reducedVCFLines);
        }
        catch (err) {
            $('#response').html(getErrorMessage(err));
            return;
        }
    }
    else {
        var greppedSNPsList = [];
        totalInputVariants = snpsInput.size;
        for (const key of snpsInput.keys()) {
            if (associMap.has(key)) {
                greppedSNPsList.push(snpsInput.get(key));
            }
        }
        var greppedSNPs = new Map();
        greppedSNPs.set("TextInput", greppedSNPsList);
    }

    try {
        var result = sharedCode.calculateScore(associationData, greppedSNPs, pValue, associMap, totalInputVariants);
        //shortens the result for website desplay
        outputVal = getSimpleOutput(result)
        $('#response').html(outputVal);
        //saves the full result on currently open session of the website for further modifications 
        resultJSON = result;
    }
    catch (err) {
        $('#response').html(getErrorMessage(err));
    }
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
 * returns a list of lines from a file
 * @param {} vcfFile 
 */
async function getFileLines(vcfFile) {
    var fileContents = await readFile(vcfFile);
    return fileContents.split("\n");
}

/**
 * Returns the number of lines from fileLines that are data lines.
 * @param {} fileLines 
 */
function getNumDatalines(fileLines) {
    var numSNPLines = 0;
    for (var i = 0; i < fileLines.length; ++i) {
        if (!fileLines[i].startsWith("#") && fileLines[i] != "") {
            numSNPLines += 1;
        }
    }
    return numSNPLines;
}

/**
 * Removes all lines that don't have positions found in the associationData. 
 * Returns a list of lines that are valid, including the metadata and header lines
 * @param {} fileLines 
 * @param {*} associMap 
 */
async function getGreppedFileLines(fileLines, associMap) {
    return jQuery.grep(fileLines, function (line) {
        return line[0] === '#' || associMap.has(getPosFromLine(line));
    });
}

/**
 * Gets chrom:pos from the line
 * @param {} line 
 */
function getPosFromLine(line) {
    var secondTab = line.indexOf('\t', line.indexOf('\t') + 1);
    return line.substr(0, secondTab).replace('\t', ':');
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
        jsonObject[i].traitResults.forEach(function (traitResult) {
            returnText += " \n  Trait: " + traitResult.trait;
            traitResult.studyResults.forEach(function (studyResult) {
                returnText +=
                    " \n    Study ID: " + studyResult.studyID +
                    " \n      Citation: " + studyResult.citation +
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
    var returnText = "Individual Name, Trait, Study ID, Citation, Odds Ratio, Percentile, # SNPs in OR, Chrom Positions in OR, SNPs in OR";

    for (var i = 0; i < jsonObject.length; ++i) {
        if (i == 0) {
            continue;
        }
        jsonObject[i].traitResults.forEach(function (traitResult) {

            traitResult.studyResults.forEach(function (studyResult) {
                returnText +=
                    "\n" + jsonObject[i].individualName +
                    "," + traitResult.trait +
                    "," + studyResult.studyID +
                    "," + studyResult.citation +
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
    var textInput = document.getElementById('input');
    //print the file's contents into the input box
    textInput.value = (result);
    //print the file's contents into an invisible storage box
    document.getElementById('savedVCFInput').value = (result);
    textInput.setAttribute("wrap", "soft");
    //removes file information text if a file was uploaded previously
    document.getElementById('list').innerHTML = ""
}

//code run when the 'Text input' button is pressed
function clickTextInput() {
    //if the text button isn't already pressed
    if (!textButtonSelected) {
        textButtonSelected = true
        var textInput = document.getElementById('input');
        //clear the input box text 
        textInput.value = null;
        //make the input text box writable
        textInput.removeAttribute('readonly');
        //make the choose file button invisible
        var browseButton = document.getElementById('file-form');
        browseButton.style.visibility = 'hidden';
        //if there was text in the text input before, writes it the the input box
        var previousText = document.getElementById('savedTextInput');
        if (previousText.value !== "") {
            document.getElementById('input').value = previousText.value;
        }
    }
}

//code run when the 'File upload' button is pressed
function clickFileUpload() {
    //if the VCf button isn't already pressed
    if (textButtonSelected) {
        textButtonSelected = false;
        //saves the contents of the text input box if it is not empty
        var textInput = document.getElementById('input');
        if (textInput.value !== "") {
            document.getElementById('savedTextInput').value = textInput.value;
        }
        //clears the input box text
        textInput.value = null;
        //make input box unwritable
        textInput.setAttribute('readonly', 'readonly');
        //makes the choose file button visible
        var browseButton = document.getElementById('file-form');
        browseButton.style.visibility = 'visible';
        //if there was text in the file upload input box before, writes it to the input box
        var previousFileText = document.getElementById('savedVCFInput');
        if (previousFileText.value !== "") {
            document.getElementById('input').value = previousFileText.value;
        }
    }

}

//when the user updates the pvalue scalar or magnitude, update the display and reset the output
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