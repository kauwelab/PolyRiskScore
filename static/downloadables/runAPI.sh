#!/bin/bash

RED='\033[0;31m'
LIGHTRED='\033[1;31m'
LIGHTBLUE='\033[1;34m'
NC='\033[0m' # No Color

function prskbMenu {
    echo "Too few arguments! Starting Menu:"
    echo -e "\n$HORIZONTALLINE"
    echo -e "                ${LIGHTBLUE}PRSKB Command Line Menu/Instructions${NC}"
    echo -e "$HORIZONTALLINE"
    echo "Welcome to the PRSKB commandline menu. Here you can learn about the different" 
    echo "parameters required to run a polygenic risk score (PRS) calculation, search" 
    echo "for a specific study or diesease, learn how to run the PRSKB calculator"
    echo "without opening this menu, or run the PRSKB calculator."
    echo ""
    echo "Select an option below by entering the corresponding character"
    echo "then pressing enter."
    echo -e "\n$HORIZONTALLINE"
    echo ""
}

function listOptions {
    echo -e " ${LIGHTBLUE}1${NC} - Learn about Parameters"
    echo -e " ${LIGHTBLUE}2${NC} - Search for a specific study or disease"
    echo -e " ${LIGHTBLUE}3${NC} - Learn how to run the calculator without opening this menu"
    echo -e " ${LIGHTBLUE}4${NC} - Run the PRSKB calculator"
    echo -e " ${LIGHTBLUE}Q${NC} - Quit"
    echo ""
}


#function runPRS {

#}

# v1.0.0
# Parameter order:
#1 VCF file path
#2 output file path (csv or txt format)
#3 p-value cutoff (ex: 0.05)
#4 refGen {hg17, hg18, hg19, hg38}

#TODO- features to be added soon
#opt diseaseList
#opt output type- csv, json (optional)
#opt studyType- large cohort(l), high impact(h) (optional)
HORIZONTALLINE="============================================================================="
if [ $# -lt 4 ]; then
    # give a menu and make the script interactive, giving access
    # to know what studies and diseases they can choose from, 
    # what valid parameters are, ect, what explanations of parameters are
    prskbMenu
    listOptions
    # echo "Too few arguments! Usage:"
    # echo "runAPI.sh [VCF file path] [output file path (csv or txt format)] [p-value cutoff (ex: 0.05)] [refGen {hg17, hg18, hg19, hg38}]"
    read -p "Press Q or [Enter] key to quit..."
elif [ ! -f "$1" ]; then
    echo "The file $1 does not exist."
    echo "Check the path and try again."
    read -p "Press [Enter] key to quit..."
elif ! [[ "$3" =~ ^[0-9]*(\.[0-9]+)?$ ]]; then
    echo "$3 is your p-value, but it is not a number."
    echo "Check the value and try again."
    read -p "Press [Enter] key to quit..."
elif ! [[ "$4" == 'hg17' ]] && ! [[ "$4" = 'hg19' ]] && ! [[ "$4" == 'hg18' ]] && ! [[ "$4" == 'hg38' ]]; then
    echo "$4 should be hg17, hg18, hg19, or hg38"
    echo "Check the value and try again."
    read -p "Press [Enter] key to quit..."
else
    echo "Running PRSKB on $1"
    # Calls a python function to get a list of SNPs from our database
    # res is a string composed of two strings separated by a '%'
    # The string is split into a list containing both strings
    res=$(python -c "import vcf_parser_grep as pg; pg.grepRes('[]', 'all', '$3', '$4')")
    declare -a resArr
    IFS='%' # percent (%) is set as delimiter
    read -ra ADDR <<< "$res" # res is read into an array as tokens separated by IFS
    for i in "${ADDR[@]}"; do # access each element of array
        resArr+=( "$i" )
    done
    IFS=' ' # reset to default value after usage
    echo ${resArr[1]} > tableObj.txt
    echo "Got SNPs and disease information from PRSKB"

    # Filters the input VCF to only include the lines that correspond to the SNPs in our GWAS database
    grep -w ${resArr[0]} "$1" > intermediate.vcf
    # prints out the tableObj string to a file so python can read it in
    # (passing the string as a parameter doesn't work because it is too large)
    echo "Greped the VCF file"

    outputType="csv" #this is the default
    #$1=intermediateFile $2=diseaseArray $3=pValue $4=csv $5="${tableObj}" $6=outputFile
    python run_prs_grep.py intermediate.vcf "$diseaseArray" "$3" "$outputType" tableObj.txt "$2"
    echo "Caculated score"
    rm intermediate.vcf
    rm tableObj.txt
    echo "Cleaned up intermediate files"
    echo "Results saved to $2"
    echo ""
    read -p "Press [Enter] key to finish..."
fi
