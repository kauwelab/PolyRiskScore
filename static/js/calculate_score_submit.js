function SubmitFormData() {
    //gets the snps from the form
    var input = document.getElementsByName("input")[0].value;

    // get value of selected 'pvalue' radio button in 'radioButtons'
    var pValue = getRadioVal( document.getElementById('radioButtons'), 'pvalue' );

    //gets the disease name from the drop down list
    var e = document.getElementById("diseaseSelect");
    var disease = e.options[e.selectedIndex].text;

    $.post("calculate_score_submit.php", { input: input, pValue: pValue, disease: disease },
    function(data) {
     $('#response').html(data);
	 //$('#myForm')[0].reset();
    });
}