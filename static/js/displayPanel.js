function displayPanel(elID) {
  var x = document.getElementById(elID);
  var x_sign = document.getElementById(elID + "_sign");
  if (x.style.height === "0px") {
    x.style.height = "auto";
    x_sign.className = "fa fa-angle-up";
  } else {
    x.style.height = "0px";
    x_sign.className = "fa fa-angle-down";
  }
}