function SubmitFormData() {
    console.log("test");
    //gets the snps from the form
    var snpArrayString = document.getElementsByName("input")[0].value;
    //the snpArray is then split on the ' ', ',' and '\n' characters and all empty items are removed
    //TODO
    //make a map!! :)

    var snpArray = snpArrayString.split(new RegExp('[, \n]', 'g')).filter(Boolean);
    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    //gets the disease name from the drop down list
    var e = document.getElementById("diseaseSelect");
    var disease = e.options[e.selectedIndex].text;
    
    $.get("/test", { snpArray: snpArray, pValue: pValue, disease: disease },
        function (data, status) {
            //data contains the info received by going to "/test"
            var fullPValue = "1e" + pValue;
            combinedOR = getCombinedOR(JSON.parse(data).recordset);
            $('#response').html("# SNPs: " + snpArray.length + " &#13;&#10P Value Cutoff: " + fullPValue + " &#13;&#10Disease(s): " + disease + " &#13;&#10Combined Odds Ratio: " + combinedOR + " &#13;&#10Data: " + data);
        }, "html").fail(function (jqXHR) {
            $('#response').html('There was an error computing the risk score:&#13;&#10&#13;&#10' + jqXHR.responseText);
        });
}

function getCombinedOR(recordset) {
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
      reader.onload = (function(theFile){
          //TO DO: If the file is really large, make a queue
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


  