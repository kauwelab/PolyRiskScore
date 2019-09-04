var calculatePolyScore = async () => {
    //user feedback while they are waiting for their score
    $('#response').html("Calculating. Please wait...")
    var vcfFile = document.getElementById("files").files[0];
    if (!vcfFile) {
        //if here, the user did not import a vcf file or the the vcf file was not read properly
        $('#response').html("Please import a vcf file using the \"Choose File\" button above.");
        return;
    }
    var fileSize = vcfFile.size;
    var extension = vcfFile.name.split(".").pop(); 
    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    //gets the disease name from the drop down list
    var diseaseSelectElement = document.getElementById("disease");
    var diseaseSelected = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].value;
    //create a disease array (usually just the one disease unless "All dieases" is selected)
    var diseaseArray = makeDiseaseArray(diseaseSelected);
    //gets the study name from the drop down list
    var studySelectElement = document.getElementById("diseaseStudy");
    var study = studySelectElement.options[studySelectElement.selectedIndex].text
    //the type of study the study is ("high impact", "large cohort", or "")
    var studyType = getStudyTypeFromStudy(study);
    //if the user doesn't specify a disease or study, prompt them to do so
    if (diseaseSelected === "--Disease--" || study === "--Study--") {
        $('#response').html('Please specify a specific disease and study using the drop down menus above.');
        return
    }
    // API-reformating

    if (fileSize > 1500000 || extension === "gz" || extension === "zip") {

        ServerCalculateScore(vcfFile, diseaseArray, studyType, pValue);
        return
    }
    ClientCalculateScore(vcfFile, extension, diseaseArray, studyType, pValue);
}

/**
 * Get's whether the study is high impact, large cohort, or none and returns a string to represent it.
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
    return "";
}


var ClientCalculateScore = async (vcfFile, extension, diseaseArray, studyType, pValue) => {
    var vcfParser = new VCFParser();
    var vcfFile = document.getElementById("files").files[0];
    var vcfObj;

    $.get("study_table", { diseaseArray: diseaseArray, studyType: studyType, pValue: pValue },

        async (studyTableRows) => {
            var tableObj = JSON.parse(studyTableRows);
            var usefulSNPs = getSNPArray(tableObj); 
            try{
                vcfObj = await vcfParser.populateMap(vcfFile, extension, usefulSNPs);
                console.log(vcfObj); 
                // What if it's empty?
             } 
             catch(err){
                 $('#response').html(err);
                 return;
             }
            var result = sharedCode.calculateScore(tableObj, vcfObj, pValue);
            setResultOutput(result);
            sessionStorage.setItem("riskResults", result);
        }, "html").fail(function (jqXHR) {
            $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
        });
}

function getSNPArray(tableObj){
    var usefulSNPs = []; 
    var tableObj = {'disease': 'ad', 'studiesRows': {'study': 'Lambert et al., 2013', 'rows': [
        {'snp': 'rs6656401', 'riskAllele': 'A', 'pValue': 5.7e-24, 'oddsRatio': 1.18}, 
        {'snp': 'rs11449', 'riskAllele': 'T', 'pValue': 6.9e-44, 'oddsRatio': 1.22}, 
        {'snp': 'rs10948363', 'riskAllele': 'G', 'pValue': 5.2e-11, 'oddsRatio': 1.1}, 
        {'snp': 'rs11771145', 'riskAllele': 'A', 'pValue': 1.1e-13, 'oddsRatio': 0.9}, 
        {'snp': 'rs9331896', 'riskAllele': 'C', 'pValue': 2.8e-25, 'oddsRatio': 0.86}, 
        {'snp': 'rs983392', 'riskAllele': 'G', 'pValue': 6.1e-16, 'oddsRatio': 0.9}, 
        {'snp': 'rs10792832', 'riskAllele': 'A', 'pValue': 9.3e-26, 'oddsRatio': 0.87}, 
        {'snp': 'rs4147929', 'riskAllele': 'A', 'pValue': 1.1e-15, 'oddsRatio': 1.15}, 
        {'snp': 'rs3865444', 'riskAllele': 'A', 'pValue': 3e-06, 'oddsRatio': 0.94}, 
        {'snp': 'rs9271192', 'riskAllele': 'C', 'pValue': 2.9e-12, 'oddsRatio': 1.11}, 
        {'snp': 'rs28834970', 'riskAllele': 'C', 'pValue': 7.4e-14, 'oddsRatio': 1.1}, 
        {'snp': 'rs11218343', 'riskAllele': 'C', 'pValue': 9.7e-15, 'oddsRatio': 0.77}, 
        {'snp': 'rs10498633', 'riskAllele': 'T', 'pValue': 5.5e-09, 'oddsRatio': 0.91}, 
        {'snp': 'rs8093731', 'riskAllele': 'T', 'pValue': 0.0001, 'oddsRatio': 0.73}, 
        {'snp': 'rs35349669', 'riskAllele': 'T', 'pValue': 3.2e-08, 'oddsRatio': 1.08}, 
        {'snp': 'rs190982', 'riskAllele': 'G', 'pValue': 3.2e-08, 'oddsRatio': 0.93}, 
        {'snp': 's2718058', 'riskAllele': 'G', 'pValue': 4.8e-09, 'oddsRatio': 0.93}, 
        {'snp': 'rs1476679', 'riskAllele': 'C', 'pValue': 5.6e-10, 'oddsRatio': 0.91}, 
        {'snp': 'rs10838725', 'riskAllele': 'C', 'pValue': 1.1e-08, 'oddsRatio': 1.08}, 
        {'snp': 'rs17125944', 'riskAllele': 'C', 'pValue': 7.9e-09, 'oddsRatio': 1.14}, 
        {'snp': 'rs7274581', 'riskAllele': 'C', 'pValue': 2.5e-08, 'oddsRatio': 0.88}]}}
    var rows = tableObj.studiesRows.rows; 
    for (i = 0; i < rows.length; i += 1){
        usefulSNPs.push(rows[i].snp);
    }
    return usefulSNPs;  
}

//API-reformating
var ServerCalculateScore = async (vcfFile, diseaseArray, studyType, pValue) => {
    var fileContents = await readFile(vcfFile);
    if (!fileContents) {
        //if here, the vcf file was not read properly- shouldn't ever happen
        $('#response').html("Could not find file contents. Please double check the file you uploaded.");
        return;
    }
    $.get("calculate_score", { fileContents: fileContents, diseaseArray: diseaseArray, studyType: studyType, pValue: pValue },
        function (data) {
            //data contains the info received by going to "/calculate_score"
            setResultOutput(data);
            sessionStorage.setItem("riskResults", data);
        }, "html").fail(function (jqXHR) {
            $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
        });

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
    // var pattern = new RegExp("2016");
    // returnText.replace(pattern, "HELLO");
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

function exampleInput() {
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