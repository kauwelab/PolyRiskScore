function SubmitFormData() {
    $('#response').html("test");
    //gets the snps from the form
    var input = document.getElementsByName("input")[0].value;
    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal(document.getElementById('radioButtons'), 'pvalue');
    //gets the disease name from the drop down list
    var e = document.getElementById("diseaseSelect");
    var disease = e.options[e.selectedIndex].text;
    $.get("/test", { input: input, pValue: pValue, disease: disease },
        function (data, status) {
            //data contains the info received by going to "/test"
            //TODO fix formating- currently just printing test variables
            $('#response').html("data:" + data + " variableType: " + typeof(data) + " status: " + status);
            //$('#response').html(data);
            //$('#myForm')[0].reset();
        }, "html");
}