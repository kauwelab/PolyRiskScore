function TestFileSendWithoutForm() {
    var vcfString ="rs6054257:G rs6054257:A " +
    "rs17330:T rs17330:A rs6040355:A rs6040355:G";
    console.log(vcfString);
    var requestStr = "/test/" + 1e-3 + "/Lou Gehrig's Disease";
    $.get(requestStr, {"snpArrayString": vcfString},
    function(data) {
        $('#response').html(data);
    });
}

function SubmitFormData() {
    $('#response').html("Calculating. Please wait...")
    //gets the snps from the form
    var fileString = document.getElementsByName("input")[0].value;
    //the snpArray is then split on the ' ', ',' and '\n' characters and all empty items are removed
    //TODO
    //make a map!! :)

    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    //gets the disease name from the drop down list
    var diseaseSelectElement = document.getElementById("diseaseSelect");
    var disease = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].text;

    $.get("/test/", {pValue: pValue, disease: disease, fileString: fileString},
        function (data) {
            //data contains the info received by going to "/test"
            $('#response').html("# SNPs: " + JSON.parse(data).numSNPs + " &#13;&#10P Value Cutoff: " + JSON.parse(data).pValueCutoff + " &#13;&#10Disease(s): " + JSON.parse(data).disease + " &#13;&#10Combined Odds Ratio: " + JSON.parse(data).combinedOR);
        }, "html").fail(function (jqXHR) {
            $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
        });
}

exports.getCombinedOR = function (recordset) {
    //get the odds ratio values from the recordset objects
    var ORs = [];
    recordset.forEach(function (element) {
        ORs.push(element.oddsRatio);
    });
    //calculate the commbined odds ratio from the odds ratio array (ORs)
    var combinedOR = 0;
    ORs.forEach(function (element) {
        combinedOR += Math.log(element);
    });
    combinedOR = Math.exp(combinedOR);
    return combinedOR;
}

function handleFileSelect(evt) {
    var vcfText;
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
        $('#input').html(vcfText);
        manipulateText(vcfText);
    })
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function manipulateText(vcfText) {
    console.log(vcfText);
    var vcfLines = vcfText.split('\n');
    console.log(vcfLines[0]);
    console.log(vcfLines[2]);
}