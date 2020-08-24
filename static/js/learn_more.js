function displayPanel(elID){
    var x = document.getElementById(elID);
    if (x.style.height === "0px") {
      x.style.height = "100px";
    } else {
      x.style.height = "0px";
    }
}