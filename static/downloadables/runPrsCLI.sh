#!/bin/bash

# ########################################################################
# 
version="1.1.0"
#
# 
# 
# HISTORY:
# 
# * 8/28/2020 - v1.0.0  - First Creation
#   Parameter order:
#       1 VCF file path OR rsIDs file path 
#       2 output file path (csv or txt format)
#       3 p-value cutoff (ex: 0.05)
#       4 refGen {hg17, hg18, hg19, hg38}
#       5 super population {AFR, AMR, EAS, EUR, SAS}

#   OPTIONAL PARAMETERS:
#       --t traitList ex. ["acne", "insomnia"]
#       --k studyType ex. ["HI", "LC", "O"]
#       --s studyIDs ex. ["GCST000727", "GCST009496"]
#       --e ethnicity ex. ["European", "East Asian"]
# 
# * 9/18/2020 - v1.1.0  - Option for two steps
#
#   OPTIONAL PARAMETERS (added):
#       --step stepNumber ex. (1 or 2)
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
HORIZONTALLINE="============================================================================="

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

usage () {
    echo -e "${LIGHTBLUE}USAGE:${NC} \n"
    echo -e "./runPrsCLI.sh ${LIGHTRED}-f [VCF file path OR rsIDs:genotype file path] ${LIGHTBLUE}-o [output file path (csv, json, or txt format)] ${LIGHTPURPLE}-c [p-value cutoff (ex: 0.05)] ${YELLOW}-r [refGen {hg17, hg18, hg19, hg38}] ${GREEN}-p [subject super population {AFR, AMR, EAS, EUR, SAS}]${NC}"
    echo ""
    echo -e "${MYSTERYCOLOR}Optional parameters to filter studies: "
    echo -e "   ${MYSTERYCOLOR}-t${NC} traitList ex. -t acne -t insomnia -t \"Alzheimer's disease\""
    echo -e "   ${MYSTERYCOLOR}-k${NC} studyType ex. -k HI -k LC -k O (High Impact, Large Cohort, Other studies)"
    echo -e "   ${MYSTERYCOLOR}-i${NC} studyIDs ex. -i GCST000727 -i GCST009496"
    echo -e "   ${MYSTERYCOLOR}-e${NC} ethnicity ex. -e European -e \"East Asian\"" 
    echo -e "${MYSTERYCOLOR}Additional Optional parameters: "
    echo -e "   ${MYSTERYCOLOR}-s${NC} stepNumber ex. -s 1 or -s 2"    
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
        echo -e "| ${LIGHTPURPLE}1${NC} - -f VCF File or rsIDs:genotypes file     |"
        echo -e "| ${LIGHTPURPLE}2${NC} - -o Output file                          |"
        echo -e "| ${LIGHTPURPLE}3${NC} - -c P-value Cutoff                       |"
        echo -e "| ${LIGHTPURPLE}4${NC} - -r RefGen                               |"
        echo -e "| ${LIGHTPURPLE}5${NC} - -p Subject Super Population             |"
        echo    "|                                             |"
        echo -e "|${LIGHTPURPLE}OPTIONAL PARAMS: ${NC}                            |"
        echo -e "| ${LIGHTPURPLE}6${NC} - -t traitList                            |"
        echo -e "| ${LIGHTPURPLE}7${NC} - -k studyType                            |"
        echo -e "| ${LIGHTPURPLE}8${NC} - -i studyIDs                             |"
        echo -e "| ${LIGHTPURPLE}9${NC} - -e ethnicity                            |"
        echo -e "| ${LIGHTPURPLE}10${NC} - -s stepNumber                         |"
        echo -e "|                                             |"
        echo -e "| ${LIGHTPURPLE}11${NC} - Done                                   |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _|"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) echo -e "${MYSTERYCOLOR}-f VCF File path or rsIDs:genotypes file path: ${NC}" 
                echo "The path to the VCF file that contains the samples for which you would like " 
                echo "the polygenic risk scores calculated. Alternativly, the path to a TXT file that"
                echo "contains rsIDs in the format of 1 rsID per line, with the genotypes following"
                echo "on the same line. (ex. rs6656401:AA or rs6656401:A) In this format, we will"
                echo "assume that any missing alleles are the risk allele."
                echo "" ;;
            2 ) echo -e "${MYSTERYCOLOR}-o Output File path: ${NC}" 
                echo "The path to the file that will contain the final polygenic risk scores. The "
                echo -e "permitted extensions are ${GREEN}.csv${NC}, ${GREEN}.json${NC}, or ${GREEN}.txt${NC} and will dictate the" 
                echo "format of the outputted results."
                echo "" ;;
            3 ) echo -e "${MYSTERYCOLOR}-c P-value Cutoff: ${NC}"
                echo "This parameter dictates which SNPs will be used in the PRS calculation. "
                echo "Those SNPs with p-values less than or equal to the given cutoff will be " 
                echo "included. "  
                echo "" ;;
            4 ) echo -e "${MYSTERYCOLOR}-r RefGen (Reference Genome): ${NC}"
                echo "This parameter tells us which reference genome was used to identify the variants " 
		        echo "in the input VCF file."
                echo "" ;;
            5 ) echo -e "${MYSTERYCOLOR}-p Subject Super Population: ${NC}"
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
            6 ) echo -e "${MYSTERYCOLOR} -t traitsList: ${NC}"
                echo "This parameter allows you to pick specifically which traits "
                echo "you would like to use to calculate PRS scores. You can see available "
                echo "traits by choosing the search option in the Options Menu " 
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            7 ) echo -e "${MYSTERYCOLOR} -k studyType: ${NC}"
                echo "This parameter allows you to pick what kind of studies you "
                echo -e "wish to run the PRS calculator on. The options are ${GREEN}HI${NC} (High Impact), " 
                echo -e "${GREEN}LC${NC} (Largest Cohort), and${GREEN} O${NC} (Other). You can include any combination "
                echo "of these and we will run calculations on the appropriate studies." 
                echo ""
                echo -e "   ${GREEN}HI (High Impact)${NC} - determined by study scores pulled from Almetric. Only " 
                echo "   the studies with the highest impact are chosen with this option. "
                echo -e "   ${GREEN}LC (Largest Cohort)${NC} - determined by study cohort size. Only the" 
                echo "   studies with the highest impact are chosen with this option." 
                echo -e "   ${GREEN}O (Other)${NC} - studies are those that do not fall under Highest Impact or" 
                echo "   Largest Cohort. " 
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            8 ) echo -e "${MYSTERYCOLOR} -i studyIDs: ${NC}"
                echo "This parameter allows you to pick specifically which studies "
                echo "you would like to use to calculate PRS scores. You can see available "
                echo "studies by choosing the search option in the Options Menu. Enter the "
                echo "GWAS Catalog Study ID of the studies you wish to use. " 
                echo "" ;;
            9 ) echo -e "${MYSTERYCOLOR} -e ethnicity: ${NC}"
                echo "This parameter allows you to filter studies to use by the ethnicity "
                echo "of the subjects used in the study. These correspond to those listed " 
                echo "by the authors. " # should we maybe show ethnicities when they search studies?
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            10 ) echo -e "${MYSTERYCOLOR} -s stepNumber: ${NC}"
                echo "EXPLAIN THIS PARAM " #TODO explain the stepNumber param
                echo "" ;;
            11 ) cont=0 ;;
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
    echo "usage is given below for your convenience (You don't need to include ./runPrsCLI.sh) "
    echo ""
    usage
    read -p "./runPrsCLI.sh " args
    calculatePRS $args
    exit;
}

calculatePRS () {
    # parse arguments 
    traitsForCalc=()
    studyTypesForCalc=()
    studyIDsForCalc=()
    ethnicityForCalc=()

    while getopts 'f:o:c:r:p:t:k:i:e:s:' c $@
    do 
        case $c in 
            f)  if ! [ -z "$filename" ]; then
                    echo "Too many filenames given at once."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                filename=$OPTARG
                if [ ! -f "$filename" ]; then
                    echo -e "The file${LIGHTRED} $filename ${NC}does not exist."
                    echo "Check the path and try again."
                    exit 1
                elif ! [[ "$filename" =~ .vcf$|.VCF$|.txt$|.TXT$ ]]; then
                    echo -e "The file${LIGHTRED} $filename ${NC}is in the wrong format."
                    echo -e "Please use a vcf or txt file."
                    exit 1
                fi;;
            o)  if ! [ -z "$output" ]; then
                    echo "Too many output files given."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                output=$OPTARG
                if ! [[ "$output" =~ .csv$|.json$|.txt$ ]]; then
                    echo -e "${LIGHTRED}$output ${NC} is not in the right format."
                    echo -e "Valid formats are ${GREEN}csv${NC}, ${GREEN}json${NC}, and ${GREEN}txt${NC}"
                    exit 1
                fi;;
            c)  if ! [ -z "$cutoff" ]; then
                    echo "Too many p-value cutoffs given"
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                cutoff=$OPTARG
                if ! [[ "$cutoff" =~ ^[0-9]*(\.[0-9]+)?$ ]]; then
                    echo -e "${LIGHTRED}$cutoff ${NC} is your p-value, but it is not a number."
                    echo "Check the value and try again."
                    exit 1
                fi;;
            r)  if ! [ -z "$refgen" ]; then
                    echo "Too many reference genomes given."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                refgen=$OPTARG
                if ! [[ "$refgen" =~ ^hg17$|^hg18$|^hg19$|^hg38$ ]]; then
                    echo -e "${LIGHTRED}$refgen ${NC}should be hg17, hg18, hg19, or hg38"
                    echo "Check the value and try again."
                    exit 1
                fi;;
            p)  if ! [ -z "$superPop" ]; then
                    echo "Too many super populations given."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                superPop=$OPTARG
                if ! [[ "$superPop" =~ ^AFR$|^AMR$|^EAS$|^EUR$|^SAS$ ]]; then
                    echo -e "${LIGHTRED}$superPop ${NC} should be AFR, AMR, EAS, EUR, or SAS."
                    echo "Check the value and try again."
                    exit 1
                fi;;
            t)  traitsForCalc+=("$OPTARG");;
            k)  if [ $OPTARG != "HI" ] && [ "$OPTARG" != "LC" ] && [ $OPTARG != "O" ]; then
                    echo "INVALID STUDY TYPE ARGUMENT. To filter by study type,"
                    echo "enter 'HI' for High Impact, 'LC' for Largest Cohort, or 'O' for Other."
                    exit 1
                fi
                studyTypesForCalc+=("$OPTARG");;
            i)  studyIDsForCalc+=("$OPTARG");;
            e)  ethnicityForCalc+=("$OPTARG");;
            s)  if ! [ -z "$step" ]; then
                    echo "Too many steps requested at once."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                step=$OPTARG
                if [[ $step -gt 3 ]]; then 
                    echo -e "${LIGHTRED}$step ${NC} is not a valid step number"
                    echo "Valid step numbers are 1 and 2"
                    exit 1
                fi;;
            [?])    usage
                    exit 1;;
        esac
    done

    # if missing a required parameter, show menu/usage option
    if [ -z "$filename" ] || [ -z "$output" ] || [ -z "$cutoff" ] || [ -z "$refgen" ] || [ -z "$superPop" ]; then
        askToStartMenu
    fi

    # if no step specified, set step to 0 and do both steps
    if [ -z "$step" ]; then
        step=0
    fi

    # finds out which version of python is called using the 'python' command, uses the correct call to use python 3
    pyVer=""
    ver=$(python --version)
    read -a strarr <<< "$ver"
    if [[ "${strarr[1]}" =~ ^3 ]]; then
        pyVer="python"
    else
        pyVer="python3"
    fi

    # preps variables for passing to python script
    export traits=${traitsForCalc[@]}
    export studyTypes=${studyTypesForCalc[@]}
    export studyIDs=${studyIDsForCalc[@]}
    export ethnicities=${ethnicityForCalc[@]}

    # determines what kind of file is being used, so we can correctly use rsids or positions
    intermediate=""
    inputType=""
    if [[ "$filename" =~ .TXT$|.txt$ ]]; then 
        inputType="rsID"
        intermediate="intermediate.txt"
    else
        inputType="vcf"
        intermediate="intermediate.vcf"
    fi

    res=""

    if [[ $step -eq 0 ]] || [[ $step -eq 1 ]]; then
        checkForNewVersion
        echo "Running PRSKB on $filename"

        # Calls a python function to get a list of SNPs from our database
        # res is a string composed of two strings separated by a '%'
        # The string is split into a list containing both strings  
        res=$($pyVer -c "import parser_grep as pg; pg.grepRes('$cutoff','$refgen','${traits}', '$studyTypes', '$studyIDs','$ethnicities', '$inputType', '$superPop')")

        declare -a resArr
        IFS='%' # percent (%) is set as delimiter
        read -ra ADDR <<< "$res" # res is read into an array as tokens separated by IFS
        for i in "${ADDR[@]}"; do # access each element of array
            resArr+=( "$i" )
        done
        IFS=' ' # reset to default value after usage
        # prints out the tableObj string to a file so python can read it in
        # (passing the string as a parameter doesn't work because it is too large)
        echo ${resArr[1]} > tableObj.txt
        echo "Got SNPs and disease information from PRSKB"

        echo ${resArr[2]} > clumpsObj.txt
        echo "Got Clumping information from PRSKB"

        # Filters the input VCF to only include the lines that correspond to the SNPs in our GWAS database
        grep -w ${resArr[0]} "$filename" > $intermediate
        echo "Filtered the input VCF file to include only the variants present in the PRSKB"
    fi


    if [[ $step -eq 0 ]] || [[ $step -eq 2 ]]; then
        IFS='.'
        read -a outFile <<< "$output"
        outputType=${outFile[1]}
        IFS=' '

        echo "Calculating prs on $filename"
        #outputType="csv" #this is the default
        #$1=intermediateFile $2=diseaseArray $3=pValue $4=csv $5="${tableObj}" $6=refGen $7=outputFile
        if [[ "$pyVer" == "python" ]]; then 
            python run_prs_grep.py "$intermediate" "$diseaseArray" "$cutoff" "$outputType" tableObj.txt clumpsObj.txt "$refgen" "$output" "$superPop"
        else
            python3 run_prs_grep.py "$intermediate" "$diseaseArray" "$cutoff" "$outputType" tableObj.txt clumpsObj.txt "$refgen" "$output" "$superPop"
        fi

        echo "Caculated score"
        rm $intermediate
        rm tableObj.txt
        rm clumpsObj.txt
        rm -r __pycache__
        echo "Cleaned up intermediate files"
        echo "Results saved to $2"
        echo ""
        exit;
    fi
}

checkForNewVersion () {
    newestVersion=$(curl -s "https://prs.byu.edu/cli_version") # checks the version on the
    
    # asks user if they want to download the newest version
    if [[ "$newestVersion" =~ ^[0-9]*(\.[0-9]+)?(\.[0-9]+)?$ ]] && [ "$newestVersion" != "$version" ]; then
        echo "There is a newer version available. Download new version? (y/n)"
        read -p "(y/n)? " decision

        case $decision in 
            [yY]* ) curl -s "https://prs.byu.edu/download_cli" -o "PrskbCLITool.zip"
                    echo ""
                    echo 'A zip file containing the updated scripts has been downloaded.'
                    echo 'Go ahead and delete the old files, extract the new ones, and run the program.'
                    # todo - make this replace the files 
                    exit;;
            [nN]* ) ;;
            * ) echo -e "Invalid option. ${LIGHTRED}New version will not be downloaded${NC}";;
        esac
    fi

}

askToStartMenu() {
    echo -e "${LIGHTRED}Missing required arguments! ${NC}"
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
}

# BEGINNING OF 'MAIN' FUNCTIONALITY

# check to see if they want the version
if [[ "$1" =~ "--version" ]] || [[ "$1" =~ "-v" ]]; then 
    echo -e "Running version ${version}"
    checkForNewVersion
fi

# pass arguments to calculatePRS
calculatePRS $@