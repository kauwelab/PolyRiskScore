#!/bin/bash

RED='\033[0;31m'
LIGHTRED='\033[1;31m'
LIGHTBLUE='\033[1;34m'
LIGHTPURPLE='\033[1;35m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function prskbMenu {
    echo -e "\n$HORIZONTALLINE"
    echo -e "                   ${LIGHTBLUE}PRSKB Command Line Menu/Instructions${NC}"
    echo -e "$HORIZONTALLINE"
    echo "Welcome to the PRSKB commandline menu. Here you can learn about the different" 
    echo "parameters required to run a polygenic risk score (PRS) calculation, search" 
    echo "for a specific study or diesease, learn how to run the PRSKB calculator"
    echo "without opening this menu, or run the PRSKB calculator."
    echo ""
    echo "Select an option below by entering the corresponding character"
    echo "then pressing [Enter]."
}

function listOptions {
    echo -e " ${LIGHTBLUE}1${NC} - Learn about Parameters"
    echo -e " ${LIGHTBLUE}2${NC} - Search for a specific study or disease"
    echo -e " ${LIGHTBLUE}3${NC} - Learn how to run the calculator without opening this menu"
    echo -e " ${LIGHTBLUE}4${NC} - Run the PRSKB calculator"
    echo -e " ${LIGHTBLUE}5${NC} - Quit"
    echo ""
}

function usage {
    echo -e "runAPI.sh ${LIGHTRED}[VCF file path] ${LIGHTPURPLE}[output file path (csv, json, or txt format)] ${LIGHTBLUE}[p-value cutoff (ex: 0.05)] ${YELLOW}[refGen {hg17, hg18, hg19, hg38}]${NC}"
    echo ""
    echo -e "${GREEN}Optional parameters: "
    echo -e "   ${GREEN}--t${NC} traitList ex. acne insomnia \"Alzheimer's disease\""
    echo -e "   ${GREEN}--k${NC} studyType ex. HI LC O (High Impact, Large Cohort, Other studies)"
    echo -e "   ${GREEN}--s${NC} studyIDs ex. GCST000727 GCST009496"
    echo -e "   ${GREEN}--e${NC} ethnicity ex. European \"East Asian\""    
    echo ""
}

function chooseOption {
    while true
    do
        echo -e "\n$HORIZONTALLINE"
        echo ""
        echo -e " ${LIGHTBLUE}Options Menu${NC}"
        echo -e " ${LIGHTBLUE}1${NC} - Learn about Parameters"
        echo -e " ${LIGHTBLUE}2${NC} - Search for a specific study or disease"
        echo -e " ${LIGHTBLUE}3${NC} - Learn how to run the calculator without opening this menu"
        echo -e " ${LIGHTBLUE}4${NC} - Run the PRSKB calculator"
        echo -e " ${LIGHTBLUE}5${NC} - Quit"
        echo ""

        read -p "#? " option

        case $option in 
            1 ) echo "You picked $option" ;;
            2 ) searchTraitsAndStudies ;;
            3 ) echo "You picked $option" ;;
            4 ) echo "You picked $option" ;;
            5 ) echo -e " ${LIGHTRED}...Quitting...${NC}"
                exit;;
            * ) echo "INVALID OPTION";;
        esac
    done
}

function searchTraitsAndStudies {
    echo -e " ${LIGHTBLUE}SEARCH STUDIES AND TRAITS:${NC}"
    echo -e " Which would you like to search, studies or traits? ${GREEN}(s/t)${NC}"
    read -p "(s/t)? " option

    case $option in 
        [sS]* ) read -p "Enter the search term you wish to use: " searchTerm 
                echo ""
                echo -e "${LIGHTPURPLE}First Author and Year | Trait | GWAS Catalog Study ID | Title${NC}"
                curl -s https://prs.byu.edu/find_studies/${searchTerm} | jq -r '.[] | .citation + " | " + .trait + " | " + .studyID + " | " + .title';;
        [tT]* ) read -p "Enter the search term you wish to use: " searchTerm 
                echo -e "${LIGHTPURPLE}"
                curl -s https://prs.byu.edu/find_traits/${searchTerm} | jq -r '.[]'
                echo -e "${NC}";;
    esac
}

# function 

function learnAboutParameters {
    echo "TODO: Intro blurb about the parameters"
    echo "The order of parameters?"
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

#OPTIONAL PARAMETERS:
# --t traitList ex. ["acne", "insomnia"]
# --k studyType ex. ["HI", "LC", "O"]
# --s studyIDs ex. ["GCST000727", "GCST009496"]
# --e ethnicity ex. ["European", "East Asian"]

HORIZONTALLINE="============================================================================="

if [ $# -lt 4 ]; then
    echo -e "${LIGHTRED}Too few arguments! ${NC}"
    echo -e "Show usage (u) or start menu (m)? "
    read -p "(u/m)? " decision
    echo ""

    case $decision in 
        [uU]* ) echo -e "${LIGHTBLUE}USAGE:${NC} \n"
                usage
                exit;;
        [mM]* ) prskbMenu
                chooseOption;;
        * ) echo -e "Invalid option. ${LIGHTRED}Quitting...${NC}"
            exit;;
    esac

    # usage
    # prskbMenu
    # chooseOption

    # give a menu and make the script interactive, giving access
    # to know what studies and diseases they can choose from, 
    # what valid parameters are, ect, what explanations of parameters are
    
    

    read -p "Press [Enter] key to quit..."
elif [ ! -f "$1" ]; then
    echo "The file $1 does not exist."
    echo "Check the path and try again."
    read -p "Press [Enter] key to quit..."
elif ! [[ "$2" =~ .csv|.json|.txt$ ]]; then
    echo "$2 is not in the right format."
    echo "Valid formats are csv, json, and txt"
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
    args=("${@:5}")

    trait=0
    studyType=0
    studyID=0
    ethnicity=0

    traitsForCalc=()
    studyTypesForCalc=()
    studyIDsForCalc=()
    ethnicityForCalc=()

    if [ ${#args[@]} -gt 0 ]; then
        for arg in "${args[@]}";
        do
            if [ "$arg" = "--t" ]; then
                trait=1
                studyType=0
                studyID=0
                ethnicity=0
            elif [ "$arg" = "--k" ]; then
                trait=0
                studyType=1
                studyID=0
                ethnicity=0
            elif [ "$arg" = "--s" ]; then
                trait=0
                studyType=0
                studyID=1
                ethnicity=0
            elif [ "$arg" = "--e" ]; then
                trait=0
                studyType=0
                studyID=0
                ethnicity=1
            elif [ $trait -eq 1 ] ; then
                traitsForCalc+=("$arg")
            elif [ $studyType -eq 1 ] ; then
                studyTypesForCalc+=("$arg")
            elif [ $studyID -eq 1 ] ; then
                studyIDsForCalc+=("$arg")
            elif [ $ethnicity -eq 1 ] ; then
                ethnicityForCalc+=("$arg")
            fi
        done
    fi

    echo "Running PRSKB on $1"

    # Calls a python function to get a list of SNPs from our database
    # res is a string composed of two strings separated by a '%'
    # The string is split into a list containing both strings
    # echo "${traitsForCalc[@]}"
    export traitsForCalc=${traitsForCalc[@]}
    export studyTypesForCalc=${studyTypesForCalc[@]}
    export studyIDsForCalc=${studyIDsForCalc[@]}
    export ethnicityForCalc=${ethnicityForCalc[@]}

    res=$(python -c "import vcf_parser_grep as pg; pg.grepRes('$3','$4','${traitsForCalc}', '$studyTypesForCalc', '$studyIDsForCalc','$ethnicityForCalc')")
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
