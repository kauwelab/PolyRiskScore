var diseasesandStudies = {};
diseasesandStudies['ADHD'] = ['High impact', 'Largest Cohort'];
diseasesandStudies['AD'] = ['Lambert et al., 2013 (High impact)', 'Largest cohort'];
diseasesandStudies['ALS'] = ['van Rheenen W, 2016 (High impact)', 'van Rheenen W, 2016 (Largest Cohort)'];
diseasesandStudies['Dep'] = ['High impact', 'Largest Cohort'];
diseasesandStudies['HD'] = ['High impact', 'Largest Cohort'];

function ChangeDiseaseList() {
    var diseaseList = document.getElementById("disease");
    var studyList = document.getElementById("diseaseStudy");
    var selDisease = diseaseList.options[diseaseList.selectedIndex].value;
    while (studyList.options.length) {
        studyList.remove(0);
    }
    
    var diseases = diseasesandStudies[selDisease];
    if (selDisease == "") {
        var temp = new Option("--Study--", 0)
        studyList.options.add(temp)
    }
    if (diseases) {
        var i;
        for (i = 0; i < diseases.length; i++){
            var study = new Option(diseases[i], i);
            studyList.options.add(study);
         }
    }
}