function SubmitFormData() {
    $('#response').html("Calculating. Please wait...")

    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;
    if (format === "default"){
        $('#response').html("Please select a valid format"); 
        return; 
    }
    //file is already read into the input box
    var fileString = document.getElementsByName("input")[0].value;
    if (fileString === undefined || fileString === "") {
        //if here, the vcf file was not read properly- shouldn't ever happen
    }

    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    //gets the disease name from the drop down list
    var diseaseSelectElement = document.getElementById("disease");
    var disease = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].text;

    //gets the study name from the drop down list
    var studySelectElement = document.getElementById("diseaseStudy");
    var study = studySelectElement.options[studySelectElement.selectedIndex].text;

    //if the user doesn't specify a disease or study, prompt them to do so
    if (disease === "--Disease--" || study === "--Study--") {
        $('#response').html('Please specify a specific disease and study using the drop down menus above.');
    }
    else {
        $.get("/calculate_score", { fileString: fileString, pValue: pValue, disease: disease, study: study },
            function (data) {
                //data contains the info received by going to "/calculate_score"
                sessionStorage.setItem('riskResults', data);
                setResultOutput(data);
            }, "html").fail(function (jqXHR) {
                $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
            });
    }
    
}

function formatText(jsonObject){
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

function formatCSV(jsonObject){
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

function changeFormat(){
    if(!sessionStorage.getItem("riskResults")){
        return
    }
    
    var data = sessionStorage.getItem("riskResults");
    setResultOutput(data); 
}

function setResultOutput(data){
    var jsonObject = JSON.parse(data);
    var outputVal = ""; 
    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;

    if(format === "text")
        outputVal += formatText(jsonObject); 
    else if(format === "csv")
        outputVal += formatCSV(jsonObject); 
    else if(format === "json")
        outputVal += data; 
    else
        outputVal += "Please select a valid format."           
                
    $('#response').html(outputVal);
}

function downloadResults(){
    var resultText = document.getElementById("response").value; 
    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;
    // $.post("/download_results", {resultText : resultText, fileFormat : format},
    // function(){
    //     //Not sure what this function needs to do right now...
    // })
    var fileName = "polyscore_" + getRandomInt(100000000);
    if(format === "csv"){
        fileName += ".csv";
    } 
    else{
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
