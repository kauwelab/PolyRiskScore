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
        studyList.options.add(new Option("All Studies", 0));
        for (i = 0; i < diseases.length; i++) {
            var study = new Option(diseases[i], i+1); //we +1 here to make way for the "All Studies" category at index 0
            studyList.options.add(study);
        }
    }
}

function changeStudiesList() {
    resetOutput();
    $('#response').html("");
}

//----testing, can delete later----------------------------------------------------

$.ajax({
    type: "GET",
    url: "get_traits",
    data: {},
    success: async function (traitTableRows) {
        console.log("they said it was a success")
        var listOfTraits = traitTableRows;
        consol.log(listOfTraits);
    },
    error: function (XMLHttpRequest) {
        return "Maddy You have an Error!";
    }
})
