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
    //console.log(vcfMap); 
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

  //Uses a FileReader Object to get the file's text. 
  //Then calls textToMap to convert the text to a map. 
  var readFile = async() => { 

    var vcfFile = document.getElementById("files").files[0]; 
    console.log(vcfFile); 
    var output = document.getElementById("uploadText"); 
    
    var reader = new Response(vcfFile); 
    output.value = await reader.text();
        // reader.readAsText(vcfFile); 
    // reader.readAsText(vcfFile); 
        // reader.readAsText(vcfFile); 
            
        // reader.onload = () => { 
        //     output.value = reader.result; 
        // }

    //console.log(output.value);   
    return output.value; 
 
  }

  function fileToMap(){
//   var fileToMap = async() => {
//     var text = await readFile(); 
//     console.log(text); 
    //readFile().then(function(text){ console.log(text)} ); 
    var vcfFile = document.getElementById("files").files[0]; 
    var cabbage = 'cabbage'; 
    //console.log(vcfFile); 
    var reader = new FileReader();
    reader.readAsText(vcfFile);
    var readerRes = new Response(vcfFile); 
    // var plainOl = []; 
    // console.log(jQuery.isPlainObject(reader));
    // console.log(jQuery.isPlainObject(vcfFile)); 
    // console.log(jQuery.isPlainObject(readerRes)); 
    // console.log(jQuery.isPlainObject(plainOl)); 
    //var str = $("files").serialize();
    // var form = $(this); 
    // console.log(form); 
    var myFile = $('input[id="files"]');
    var serFile = myFile.serialize();  
    //var recursiveEncoded = $.param( vcfFile );
    //var recursiveDecoded = decodeURIComponent( $.param( vcfFile ) );
    // console.log(myFile); 
    // console.log(serFile); 
    //console.log(recursiveEncoded); 
    //console.log(recursiveDecoded);
    
    var form = $(this),
        formData = new FormData()
        formParams = form.serializeArray();

    $.each(form.find('input[type="file"]'), function(i, tag) {
      $.each($(tag)[0].files, function(i, file) {
        formData.append(tag.name, file);
      });
    });

    $.each(formParams, function(i, val) {
      formData.append(val.name, val.value);
    });

    console.log(formData); 
    $.get("/parse_vcf", {carnage : cabbage} , 
        function(data, status){
            console.log(data); 
        });
  }

 

  
