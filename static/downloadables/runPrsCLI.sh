#!/bin/bash

# ########################################################################
# 
version="1.0.0"
#
# 
# 
# HISTORY:
# 
# * 8/28/2020 - v1.0.0  - First Creation
# 
# ########################################################################

RED='\033[0;31m'
LIGHTRED='\033[1;31m'
LIGHTBLUE='\033[1;34m'
LIGHTPURPLE='\033[1;35m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
MYSTERYCOLOR='\033[1;49;36m'
NC='\033[0m' # No Color

prskbMenu () {
    echo -e "\n$HORIZONTALLINE"
    echo -e "                   ${LIGHTBLUE}PRSKB Command Line Menu/Instructions${NC}"
    echo -e "$HORIZONTALLINE"
    echo "Welcome to the PRSKB commandline menu. Here you can learn about the different" 
    echo "parameters required to run a polygenic risk score (PRS) calculation, search" 
    echo "for a specific study or diesease, view usage, or run the PRSKB calculator."
    echo ""
    echo "Select an option below by entering the corresponding number"
    echo "then pressing [Enter]."
}

listOptions () {
    echo -e " ${LIGHTBLUE}1${NC} - Learn about Parameters"
    echo -e " ${LIGHTBLUE}2${NC} - Search for a specific study or disease"
    echo -e " ${LIGHTBLUE}3${NC} - View usage"
    echo -e " ${LIGHTBLUE}4${NC} - Run the PRSKB calculator"
    echo -e " ${LIGHTBLUE}5${NC} - Quit"
    echo ""
}

usage () {
    echo -e "${LIGHTBLUE}USAGE:${NC} \n"
    echo -e "./runAPI.sh ${LIGHTRED}[VCF file path] ${LIGHTBLUE}[output file path (csv, json, or txt format)] ${LIGHTPURPLE}[p-value cutoff (ex: 0.05)] ${YELLOW}[refGen {hg17, hg18, hg19, hg38}]${NC} ${GREEN}[subject ethnicity {AFR, AMR, EAS, EUR, SAS}]${NC}"
    echo ""
    echo -e "${MYSTERYCOLOR}Optional parameters to filter studies: "
    echo -e "   ${MYSTERYCOLOR}--t${NC} traitList ex. acne insomnia \"Alzheimer's disease\""
    echo -e "   ${MYSTERYCOLOR}--k${NC} studyType ex. HI LC O (High Impact, Large Cohort, Other studies)"
    echo -e "   ${MYSTERYCOLOR}--s${NC} studyIDs ex. GCST000727 GCST009496"
    echo -e "   ${MYSTERYCOLOR}--e${NC} ethnicity ex. European \"East Asian\""    
    echo ""
}

chooseOption () {
    while true
    do
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ "
        echo    "|                                             |"
        echo -e "| ${LIGHTBLUE}Options Menu${NC}                                |"
        echo -e "| ${LIGHTBLUE}1${NC} - Learn about Parameters                  |"
        echo -e "| ${LIGHTBLUE}2${NC} - Search for a specific study or disease  |"
        echo -e "| ${LIGHTBLUE}3${NC} - View usage                              |"
        echo -e "| ${LIGHTBLUE}4${NC} - Run the PRSKB calculator                |"
        echo -e "| ${LIGHTBLUE}5${NC} - Quit                                    |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _|"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) learnAboutParameters ;;
            2 ) searchTraitsAndStudies ;;
            3 ) usage ;;
            4 ) runPRS ;;
            5 ) echo -e " ${LIGHTRED}...Quitting...${NC}"
                exit;;
            * ) echo "INVALID OPTION";;
        esac
    done
}

learnAboutParameters () {
    cont=1
    echo ""
    echo -e "                    ${LIGHTPURPLE}PARAMETERS: ${NC}"
    echo "Not sure what you need to input for a certain parameter, or "
    echo "unsure why a parameter is required? Pick the number corresponding "
    echo "to the parameter to learn more about it. "
    echo ""

    while [[ "$cont" != "0" ]]
    do 
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ "
        echo    "|                                             |"
        echo -e "|${LIGHTPURPLE}REQUIRED PARAMS: ${NC}                            |"
        echo -e "| ${LIGHTPURPLE}1${NC} - VCF File                                |"
        echo -e "| ${LIGHTPURPLE}2${NC} - Output file                             |"
        echo -e "| ${LIGHTPURPLE}3${NC} - P-value Cutoff                          |"
        echo -e "| ${LIGHTPURPLE}4${NC} - RefGen                                  |"
        echo -e "| ${LIGHTPURPLE}5${NC} - Subject Ethnicity                       |"
        echo    "|                                             |"
        echo -e "|${LIGHTPURPLE}OPTIONAL PARAMS: ${NC}                            |"
        echo -e "| ${LIGHTPURPLE}6${NC} - --t traitList                           |"
        echo -e "| ${LIGHTPURPLE}7${NC} - --k studyType                           |"
        echo -e "| ${LIGHTPURPLE}8${NC} - --s studyIDs                            |"
        echo -e "| ${LIGHTPURPLE}9${NC} - --e ethnicity                           |"
        echo -e "|                                             |"
        echo -e "| ${LIGHTPURPLE}10${NC} - Done                                   |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _|"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) echo -e "${MYSTERYCOLOR} VCF File path: ${NC}" 
                echo "The path to the VCF file that contains the samples for which you would like " 
                echo "the polygenic risk scores calculated."
                echo "" ;;
            2 ) echo -e "${MYSTERYCOLOR} Output File path: ${NC}" 
                echo "The path to the file that will contain the final polygenic risk scores. The "
                echo -e "permitted extensions are ${GREEN}.csv${NC}, ${GREEN}.json${NC}, or ${GREEN}.txt${NC} and will dictate the" 
                echo "format of the outputted results."
                echo "" ;;
            3 ) echo -e "${MYSTERYCOLOR} P-value Cutoff: ${NC}"
                echo "This parameter dictates which SNPs will be used in the PRS calculation. "
                echo "Those SNPs with p-values less than or equal to the given cutoff will be " 
                echo "included. "  
                echo "" ;;
            4 ) echo -e "${MYSTERYCOLOR} RefGen (Reference Genome): ${NC}"
                echo "This parameter tells us which reference genome was used to identify the variants " 
		echo "in the input VCF file."
                echo "" ;;
            5 ) echo -e "${MYSTERYCOLOR} Subject Ethnicity: ${NC}"
                echo "This parameter is required for us to run Linkage Disequilibrium on "
                echo "SNPs for PRS calculation. We use the five super populations from the " 
                echo "1000 Genomes as the available options. Below are the acceptable codes. " # this will need some re-work on the language
                echo "" #AFR, AMR, EAS, EUR, SAS
                echo -e "   ${GREEN}AFR${NC} - African population " 
                echo -e "   ${GREEN}AMR${NC} - Ad Mixed American population " 
                echo -e "   ${GREEN}EAS${NC} - East Asian population " 
                echo -e "   ${GREEN}EUR${NC} - European population " 
                echo -e "   ${GREEN}SAS${NC} - South Asian population " 
                echo "" ;;
            6 ) echo -e "${MYSTERYCOLOR} --t traitsList: ${NC}"
                echo "This parameter allows you to pick specifically which traits "
                echo "you would like to use to calculate PRS scores. You can see available "
                echo "traits by choosing the search option in the Options Menu " 
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            7 ) echo -e "${MYSTERYCOLOR} --k studyType: ${NC}"
                echo "This parameter allows you to pick what kind of studies you "
                echo -e "wish to run the PRS calculator on. The options are ${GREEN}HI${NC} (High Impact), " 
                echo -e "${GREEN}LC${NC} (Largest Cohort), and${GREEN} O${NC} (Other). You can include any combination "
                echo "of these and we will ... " 
                echo ""
                echo -e "   ${GREEN}HI (High Impact)${NC} - determined by study scores pulled from ____. Only " 
                echo "   the studies with the highest impact are chosen with this option. "
                echo -e "   ${GREEN}LC (Largest Cohort)${NC} - determined by study cohort size. Only the" 
                echo "   studies with the highest impact are chosen with this option." 
                echo -e "   ${GREEN}O (Other)${NC} - studies are those that do not fall under Highest Impact or" 
                echo "   Largest Cohort. " 
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            8 ) echo -e "${MYSTERYCOLOR} --s studyIDs: ${NC}"
                echo "This parameter allows you to pick specifically which studies "
                echo "you would like to use to calculate PRS scores. You can see available "
                echo "studies by choosing the search option in the Options Menu. Enter the "
                echo "GWAS Catalog Study ID of the studies you wish to use. " 
                echo "" ;;
            9 ) echo -e "${MYSTERYCOLOR} --e ethnicity: ${NC}"
                echo "This parameter allows you to filter studies to use by the ethnicity "
                echo "of the subjects used in the study. These correspond to those listed " 
                echo "by the authors. " # should we maybe show ethnicities when they search studies?
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            10 ) cont=0 ;;
            * ) echo "INVALID OPTION";;
        esac
        if [[ "$cont" != "0" ]]; then
            read -p "Return to Parameters? (y/n) " returnToParams
            echo ""
            case $returnToParams in 
                [yY]* ) ;;
                * ) cont=0;;
            esac
        fi
    done
}

searchTraitsAndStudies () {
    echo -e " ${LIGHTBLUE}SEARCH STUDIES AND TRAITS:${NC}"
    echo -e " Which would you like to search, studies or traits? ${GREEN}(s/t)${NC}"
    read -p "(s/t)? " option
    sub="'"
    backslash='\'
    NEWLINE='\n'

    case $option in 
        [sS]* ) read -p "Enter the search term you wish to use: " searchTerm 
		if [[ "$searchTerm" = *"'"* ]]; then
			searchTerm=${searchTerm//${sub}/${backslash}${sub}}
		fi
                echo ""
                echo -e "${LIGHTPURPLE}First Author and Year | Trait | GWAS Catalog Study ID | Title${NC}"
		curl -s https://prs.byu.edu/find_studies/${searchTerm} | jq -r 'sort_by(.citation) | .[] | .citation + " | " + .trait + " | " + .studyID + " | " + .title + "\n"';;
        [tT]* ) read -p "Enter the search term you wish to use: " searchTerm 
		if [[ "$searchTerm" = *"'"* ]]; then
			echo "in if"
			searchTerm=${searchTerm//${sub}/${backslash}${sub}}
		fi
                echo -e "${LIGHTPURPLE}"
                curl -s https://prs.byu.edu/find_traits/${searchTerm} | jq -r '.[]'
                echo -e "${NC}";;
        * ) echo -e "Invalid option." ;;
    esac
}

runPRS () {
    echo -e "${LIGHTBLUE}RUN THE PRSKB CALCULATOR:${NC}"
    echo "The calculator will run and then the program will exit. Enter the parameters "
    echo "as you would if you were running the program without opening the menu. The "
    echo "usage is given below for your convenience (You don't need to include ./runPRS.sh) "
    echo ""
    usage
    read -p "./runPRS.sh " args
    args=$(echo "$args" | sed -r "s/([a-zA-Z])(')([a-zA-z])/\1\\\\\2\3/g" | sed -r "s/(\"\S*)(\s)(\S*\")/\1_\3/g")
    args=( $(xargs -n1 -0 <<<"$args") )
    echo "${args[@]}" 
    # TODO: put the validity check here for variables. 
    calculatePRS ${args[@]}
    exit;
}

calculatePRS () {
    args=("${@:6}")

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
                if [ $arg != "HI" ] && [ "$arg" != "LC" ] && [ $arg != "O" ]
                then
                    echo "INVALID STUDY TYPE ARGUMENT. To filter by study type,"
                    echo "enter 'HI' for High Impact, 'LC' for Largest Cohort, or 'O' for Other."
                    exit 1
                fi	
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
    
    export traits=${traitsForCalc[@]}
    export studyTypes=${studyTypesForCalc[@]}
    export studyIDs=${studyIDsForCalc[@]}
    export ethnicities=${ethnicityForCalc[@]}

    res=$(python3 -c "import vcf_parser_grep_test as pg; pg.grepRes('$3','$4','${traits}', '$studyTypes', '$studyIDs','$ethnicities')")
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
    #$1=intermediateFile $2=diseaseArray $3=pValue $4=csv $5="${tableObj}" $6=refGen $7=outputFile
    python3 run_prs_grep.py intermediate.vcf "$diseaseArray" "$3" "$outputType" tableObj.txt "$4" "$2" "$5"
    echo "Caculated score"
    rm intermediate.vcf
    rm tableObj.txt
    rm -r __pycache__
    echo "Cleaned up intermediate files"
    echo "Results saved to $2"
    echo ""
    exit;
}

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

newestVersion=$(curl -X GET --header "Accept: */*" "http://localhost:3000/cli_version")
echo "Response from server"
echo $result
exit

if [ $# -lt 4 ]; then
    echo -e "${LIGHTRED}Too few arguments! ${NC}"
    echo -e "Show usage (u) or start menu (m)? "
    read -p "(u/m)? " decision
    echo ""

    case $decision in 
        [uU]* ) usage
                exit;;
        [mM]* ) prskbMenu
                chooseOption;;
        * ) echo -e "Invalid option. ${LIGHTRED}Quitting...${NC}"
            exit;;
    esac

    # give a menu and make the script interactive, giving access
    # to know what studies and diseases they can choose from, 
    # what valid parameters are, ect, what explanations of parameters are

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
    calculatePRS "${@}"
fi
