function ChangeDiseaseList() {
    //sessionStorage.removeItem("riskResults");
    resetOutput();
    $('#response').html("");
    var diseaseList = document.getElementById("disease");
    var studyList = document.getElementById("diseaseStudy");
    var selDisease = diseaseList.options[diseaseList.selectedIndex].value;
    while (studyList.options.length) {
        studyList.remove(0);
    }

    //diseasesAndStudiesObj found in sharedCode.js
    var diseases = sharedCode.getDiseasesAndStudiesObj()[selDisease];
    if (selDisease == "") {
        var temp = new Option("--Study--", 0)
        studyList.options.add(temp)
    }
    if (diseases) {
        var i;
        for (i = 0; i < diseases.length; i++) {
            var study = new Option(diseases[i], i);
            studyList.options.add(study);
        }
    }
}
