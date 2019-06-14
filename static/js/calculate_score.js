async function SubmitFormData() {
    $('#response').html("Calculating. Please wait...")

    //file is already read into the input box
    var fileString = document.getElementsByName("input")[0].value;
    if (fileString === undefined || fileString === "") {
        //if here, the vcf file was not read properly
    }

    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    //gets the disease name from the drop down list
    var diseaseSelectElement = document.getElementById("diseaseSelect");
    var disease = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].text;

    $.get("/calculate_score", { fileString: fileString, pValue: pValue, disease: disease },
    function (data, status) {
        //data contains the info received by going to "/calculate_score"
        var jsonObject = JSON.parse(data);

        var returnText = "";
        //iterate through the list of people and print them each out seperately.
        jsonObject.forEach(function (person){
            returnText += "# SNPs: " + JSON.parse(person).numSNPs + 
                            " &#13;&#10P Value Cutoff: " + JSON.parse(person).pValueCutoff + 
                            " &#13;&#10Disease(s): " + JSON.parse(person).disease + 
                            " &#13;&#10Combined Odds Ratio: " + JSON.parse(person).combinedOR + "&#13;&#10&#13;&#10";
        });
        $('#response').html(returnText);
    }, "html").fail(function (jqXHR) {
        $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
    });
}

//Outputs some file information when the user selects a file. 
function handleFileSelect(evt) {
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