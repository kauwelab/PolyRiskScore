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
    fileToMap(); 
    //If this is empty, get it from file. 
    //Figure out how to deal with empty file and input...
    //the snpArray is then split on the ' ', ',' and '\n' characters and all empty items are removed

    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    //gets the disease name from the drop down list
    var diseaseSelectElement = document.getElementById("diseaseSelect");
    var disease = diseaseSelectElement.options[diseaseSelectElement.selectedIndex].text;

    $.get("/test", { snpArray: snpArray, pValue: pValue, disease: disease },
        function (data, status) {
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

//Outputs some file information when the user selects a file. 
function handleFileSelect(evt) {
    var f = evt.target.files[0]; // FileList object
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
    createMap(); 
  }

   function createMap(){
   
    var vcfFile = document.getElementById("files").files[0]; 

    var reader = new FileReader();
    reader.readAsText(vcfFile, 'UTF-8');
    reader.onload = shipoff; 

    function shipoff(event){
        var result = event.target.result; 
        var filename = vcfFile.name; 
        var vcfMap = new Map(); 
        $.post('/parse_vcf', {data : result, name : filename})
            .done(function(response, status){ 
                vcfMap = convertToMap(response); 
                console.log(vcfMap)
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

 

  
