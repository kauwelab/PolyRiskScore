function displayPanel(elID){
    var x = document.getElementById(elID);
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
}