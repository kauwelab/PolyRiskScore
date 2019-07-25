
function getStudyLinks() {
debugger;
    $.get("/get_studies",
    function (data, status) {
    
    var studiesString = ""
    studiesArray = data
    debugger;
    for (var i = 0; i < studiesArray.length; i++) {
        studiesString  += "<li><a href=\"" + studiesArray[i].URL + "\"> \n"
            + studiesArray[i].reference + "</a></li> \n";
    }
    document.getElementById('publications').innerHTML = studiesString

    /*debugger    
    var studiesArray = JSON.parse(data)
    var studiesObjects = []
    for (var i = 0; i < studiesArray.length(); i++) {
        studiesObjects.push(JSON.parse(studiesArray[i]))
    }

    var studiesString = ""

    for (var i = 0; i < studiesObjects.length(); i++) {
        studiesString  += "<li><a href=\"" + studiesObjects[i].URL + "\"> \n"
            + studiesObjects[i].reference + "</a></li> \n";
    }

    document.getElementById('publications').innerHTML = studiesString;
*/
    })
}

function changeList() {
    var tempString = "<li><a href=\"https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML\"> this is what the list item should say</a></li>";
    document.getElementById('publications').innerHTML = tempString;
}
