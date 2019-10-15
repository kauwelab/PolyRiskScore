

function getSliderPVal(form, name) {
    var slider = form.elements[name];

    var val = slider.value; //gives a negative number that is the exponent
    pval = "1e".concat(val);
    return pval;
}
