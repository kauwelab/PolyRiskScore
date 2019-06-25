function SubmitFormData() {
    $('#response').html("Calculating. Please wait...")

    //file is already read into the input box
    var fileString = document.getElementsByName("input")[0].value;
<<<<<<< HEAD
    //If this is empty, get it from file. 
    //Figure out how to deal with empty file and input...
    //the snpArray is then split on the ' ', ',' and '\n' characters and all empty items are removed
=======
    if (fileString === undefined || fileString === "") {
        //if here, the vcf file was not read properly- shouldn't ever happen
    }
>>>>>>> 5af4fe3e69d0d62f89deedc531b3da32a2c01459

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
                var jsonObject = JSON.parse(data);

                var returnText = "";
                //iterate through the list of people and print them each out seperately.
                jsonObject.forEach(function (sample) {
                    returnText += "SampleName: " + JSON.parse(sample).sampleName + 
                        " &#13;&#10# SNPs Tested: " + JSON.parse(sample).numSNPsTested +
                        " &#13;&#10P Value Cutoff: " + JSON.parse(sample).pValueCutoff +
                        " &#13;&#10Disease(s): " + JSON.parse(sample).disease +
                        " &#13;&#10Combined Odds Ratio: " + JSON.parse(sample).combinedOR + "&#13;&#10&#13;&#10";
                });
                $('#response').html(returnText);
            }, "html").fail(function (jqXHR) {
                $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
            });
    }
}

//Outputs some file information when the user selects a file. 
function handleFileSelect(evt) {
    var f = evt.target.files[0]; // FileList object
<<<<<<< HEAD
    var output = [];    
      output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
                  f.size, ' bytes, last modified: ',
                  f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
                  '</li>');
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>'; 
  }

 
  //If you want to get the return value from this function,
  //Make an asyncronous function that says
  //var text = await readFile... 
  var readFile = async() => { 

    var vcfFile = document.getElementById("files").files[0]; 
    console.log(vcfFile); 
    var output = document.getElementById("uploadText"); 
    
    var reader = new Response(vcfFile); 
    output.value = await reader.text();

    return output.value; 
 
  }

  function fileToMap(){
    console.log("Got here"); 
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    var diseaseSelectElement = document.getElementById("diseaseSelect");
    var disease = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].text;

    var vcfFile = document.getElementById("files").files[0]; 

    var reader = new FileReader();
    reader.readAsText(vcfFile, 'UTF-8');
    reader.onload = shipoff; 

    function shipoff(event){
        var result = event.target.result; 
        var filename = vcfFile.name; 
        var vcfMap = new Map(); 
        $.post('/parse_vcf', {fileData : result, name : filename, pVal : pValue, testDisease : disease})
            .done(function(response, status){ 
                console.log(response); 
            })
            .fail(function(error){
                $('#response').html(error.responseText);
            })
    }
}

function convertToMap(vcfArray){
    const vcfMap = new Map(vcfArray.map(obj => [ obj.key, obj.val ]));
    return vcfMap; 
}

 

  
=======
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
>>>>>>> 5af4fe3e69d0d62f89deedc531b3da32a2c01459
