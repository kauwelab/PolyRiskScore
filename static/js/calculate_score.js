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
    var formData = new FormData();
    console.log($('#files')[0].files[0]);
    formData.append('file', $('#files')[0].files[0]);
    console.log(formData);
    $.ajax({
           url : '/parse_vcf',
           type : 'GET',
           data : formData,
           processData: false,  // tell jQuery not to process the data
           contentType: false,  // tell jQuery not to set contentType
           success : function(data) {
               console.log(data);
               alert(data);
           }
    });
//   var fileToMap = async() => {
//     var text = await readFile(); 
//     console.log(text); 
    //readFile().then(function(text){ console.log(text)} ); 
    // var vcfFile = document.getElementById("files").files[0]; 
    // var formData = new FormData();
    // formData.append('file', vcfFile);
    // console.log(formData); 
    // //serData = formData.stringify(); 
    // var form = $('#file-form'); 
    // console.log(form); 
    //console.log(vcfFile); 
    //var reader = new FileReader();
    //reader.readAsText(vcfFile);
    //var readerRes = new Response(vcfFile); 
    //var serReader = JSON.stringify(readerRes);
    //console.log(serReader); 
    // var plainOl = []; 
    // console.log(jQuery.isPlainObject(reader));
    // console.log(jQuery.isPlainObject(vcfFile)); 
    // console.log(jQuery.isPlainObject(readerRes)); 
    // console.log(jQuery.isPlainObject(plainOl)); 
    //var str = $("files").serialize();
    //var form = $(this); 
    //console.log(form); 
    // var formInfo = document.getElementById('file-form');
    // var formData = new FormData(formInfo);
    // console.log(formInfo);
    // console.log(formData); 
    //var myFile = $('input[id="files"]'); //C:\fakepath\sample.vcf
    //var serFile = myFile.serialize();  
    //var recursiveEncoded = $.param( vcfFile );
    //var recursiveDecoded = decodeURIComponent( $.param( vcfFile ) );
    //  console.log(myFile); 
    //  console.log(serFile); 
    //console.log(recursiveEncoded); 
    //console.log(recursiveDecoded);
    
    // var form = $(this),
    //     formData = new FormData()
    //     formParams = form.serializeArray();

    // $.each(form.find('input[type="file"]'), function(i, tag) {
    //   $.each($(tag)[0].files, function(i, file) {
    //     formData.append(tag.name, file);
    //   });
    // });

    // $.each(formParams, function(i, val) {
    //   formData.append(val.name, val.value);
    // });

    //console.log(formData); 
    //console.log(vcfFile); 
    //var encodeData = encodeFormData(vcfFile); 
    //console.log(encodeData); 
    // $.get("/parse_vcf", {fileData : form.serialize()} , 
    // function(data, status){
    //     console.log(JSON.stringify(data)); 
    // });
    //console.log(form.serialize().innerText); 
  }
 
  function encodeFormData(data) {
    if (!data){ 
        console.log("No data!");
        return "";  
    }    // Always return a string
    var pairs = [];          // To hold name=value pairs
    for(var name in data) {    
        //console.log(name);                                 // For each name
        // if (!data.hasOwnProperty(name)){
        //     console.log("No own property!");
        //     continue;
        // }               // Skip inherited
        if (typeof data[name] === "function"){
            console.log("Type was function.");
            continue; 
        }        // Skip methods
        var value = data[name].toString();                     // Value as string
        name = encodeURIComponent(name).replace("%20","+");    // Encode name
        value = encodeURIComponent(value).replace("%20", "+"); // Encode value
        pairs.push(name + "=" + value);   // Remember name=value pair
    }
    return pairs.join('&'); // Return joined pairs separated with &
}
  
