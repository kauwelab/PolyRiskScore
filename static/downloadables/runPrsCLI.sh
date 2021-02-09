#!/bin/bash

# ########################################################################
# 
version="1.5.0"
#
# 
# 
# HISTORY:
# 
# * 8/28/2020 - v1.0.0  - First Creation
#   Parameter order:
#       1 VCF file path OR rsIDs file path 
#       2 output file path (tsv or txt format)
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
# * 10/8/2020 - v1.2.0 (should technically be 2.0.0)
# 
#   Now using getopts. Parameters updated
#   REQUIRED PARAMS:
#       -f input file path (VCF or TXT with rsIDs)
#       -o output file path (TSV or TXT)
#       -c p-value cutoff
#       -r refGen (hg17, hg18, hg19, hg38)
#       -p super population (AFR, AMR, EAS, EUR, SAS)
#
#   OPTIONAL PARAMS:
#       -t traitList
#       -k studyType
#       -i studyIDs
#       -e ethnicity
#       -v True/False verbose output file
#       -s stepNumber
#
# * 12/9/2020 - v1.3.0
#
#   Added optional param:
#       -g biological sex prefered for snp selection
#
# * 1/29/21 - v1.4.0
#   
#   Added the ability to calculate scores using vcf/txt
#   files zipped in zip, tar-like, and gz-like formats
#
# * 2/8/21 - v1.5.0
#   
#   Changed csv output type to tsv.
#
# ########################################################################

# colors for text printing
RED='\033[0;31m'
LIGHTRED='\033[1;31m'
LIGHTBLUE='\033[1;34m'
LIGHTPURPLE='\033[1;35m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
MYSTERYCOLOR='\033[1;49;36m'
NC='\033[0m' # No Color
HORIZONTALLINE="============================================================================="

# introduces the PRSKB menu
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

# the usage statement of the tool
usage () {
    echo -e "${LIGHTBLUE}USAGE:${NC} \n"
    echo -e "./runPrsCLI.sh ${LIGHTRED}-f [VCF file path OR rsIDs:genotype file path] ${LIGHTBLUE}-o [output file path (tsv, json, or txt format)] ${LIGHTPURPLE}-c [p-value cutoff (ex: 0.05)] ${YELLOW}-r [refGen {hg17, hg18, hg19, hg38}] ${GREEN}-p [subject super population {AFR, AMR, EAS, EUR, SAS}]${NC}"
    echo ""
    echo -e "${MYSTERYCOLOR}Optional parameters to filter studies: "
    echo -e "   ${MYSTERYCOLOR}-t${NC} traitList ex. -t acne -t insomnia -t \"Alzheimer's disease\""
    echo -e "   ${MYSTERYCOLOR}-k${NC} studyType ex. -k HI -k LC -k O (High Impact, Large Cohort, Other studies)"
    echo -e "   ${MYSTERYCOLOR}-i${NC} studyIDs ex. -i GCST000727 -i GCST009496"
    echo -e "   ${MYSTERYCOLOR}-e${NC} ethnicity ex. -e European -e \"East Asian\"" 
    echo -e "${MYSTERYCOLOR}Additional Optional parameters: "
    echo -e "   ${MYSTERYCOLOR}-v${NC} verbose ex. -v True (indicates a more detailed result file)"
    echo -e "   ${MYSTERYCOLOR}-g${NC} defaultSex ex. -g male -g female"
    echo -e "   ${MYSTERYCOLOR}-s${NC} stepNumber ex. -s 1 or -s 2"    
    echo ""
}

# the options menu - prints the menu, waits for user input, and then directs them where they want to go
chooseOption () {
    while true
    do
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ "
        echo    "|                                             |"
        echo -e "| ${LIGHTBLUE}Options Menu${NC}                                |"
        echo -e "| ${LIGHTBLUE}1${NC} - Learn about Parameters                  |"
        echo -e "| ${LIGHTBLUE}2${NC} - Search for a specific study or disease  |"
        echo -e "| ${LIGHTBLUE}3${NC} - View available ethnicities for filter   |"
        echo -e "| ${LIGHTBLUE}4${NC} - View usage                              |"
        echo -e "| ${LIGHTBLUE}5${NC} - Run the PRSKB calculator                |"
        echo -e "| ${LIGHTBLUE}6${NC} - Quit                                    |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _|"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) learnAboutParameters ;;
            2 ) searchTraitsAndStudies ;;
            3 ) printEthnicities ;;
            4 ) usage ;;
            5 ) runPRS ;;
            6 ) echo -e " ${LIGHTRED}...Quitting...${NC}"
                exit;;
            * ) echo "INVALID OPTION";;
        esac
    done
}

# teaches the user about the tools parameters
# pulls up a new Params menu, which will take the input and tell the user about the parameters they want to know about
# loops until the user wants to go back to the main menu
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
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _"
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
        echo -e "| ${LIGHTPURPLE}10${NC} - -v verbose result file                 |"
        echo -e "| ${LIGHTPURPLE}11${NC} - -g defaultSex                          |"
        echo -e "| ${LIGHTPURPLE}12${NC} - -s stepNumber                          |"
        echo -e "|                                             |"
        echo -e "| ${LIGHTPURPLE}13${NC} - Done                                   |"
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
                echo -e "permitted extensions are ${GREEN}.tsv${NC}, ${GREEN}.json${NC}, or ${GREEN}.txt${NC} and will dictate the" 
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
                echo "by the authors. A list can be printed from the corresponding menu option."
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            10 ) echo -e "${MYSTERYCOLOR} -v verbose: ${NC}"
                echo "For a more detailed result file, include the '-v True' parameter."
                echo "The verbose output file will include the reported trait, trait, polygenic risk score," 
                echo "and lists of the protective variants, risk variants, and variants with unknown or neutral"
                echo "effect on the PRS for each corresponding sample and study."
                echo "If this parameter is not included, the default result file will include the study ID"
                echo "and the corresponding polygenic risk scores for each sample." 
                echo "" ;;
            11 ) echo -e "${MYSTERYCOLOR} -g defaultSex: ${NC}"
                echo "Some studies have duplicates of the same snp that differ by which biological sex the"
                echo "p-value is associated with. You can indicate which sex you would like snps to select"
                echo "when both options (M/F) are present. The system default is Female"
                echo "" ;;
            12 ) echo -e "${MYSTERYCOLOR} -s stepNumber: ${NC}"
                echo "Either a 1 or a 2."
                echo "This parameter allows you to split up the running of the tool into two steps."
                echo "The advantage of this is that the first step, which requires internet, can be"
                echo "run separately from step 2, which does not require an internet connection."
                echo "" ;;
            13 ) cont=0 ;;
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

# User has the option to search studies or traits
# calls the appropriate api endpoint for the query and formats the results for the user to view
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
                echo "" # might need to do something to combine results with the same studyID?
                echo -e "${LIGHTPURPLE}First Author and Year | GWAS Catalog Study ID | Reported Trait | Trait | Title${NC}"
		        curl -s https://prs.byu.edu/find_studies/${searchTerm} | jq -r 'sort_by(.citation) | .[] | .citation + " | " + .studyID + " | " + .reportedTrait + " | " + .trait + " | " + .title + "\n"';;
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

printEthnicities () {
    echo -e " ${LIGHTPURPLE}PRINTING AVAILABLE ETHNICITES TO FILTER BY:${NC}"
    curl -s https://prs.byu.edu/ethnicities | jq -r '.[]'
    echo -e ""
}

# will allow the user to run the PRSKB calculator from the menu
# takes in the required params, then passes to calculatePRS
runPRS () {
    echo -e "${LIGHTBLUE}RUN THE PRSKB CALCULATOR:${NC}"
    echo "The calculator will run and then the program will exit. Enter the parameters "
    echo "as you would if you were running the program without opening the menu. The "
    echo "usage is given below for your convenience (You don't need to include ./runPrsCLI.sh) "
    echo ""
    usage
    read -p "./runPrsCLI.sh " args
    args=$(echo "$args" | perl -pe "s/(\")(\S*)(\s)(\S*)(\")/\2_\4/g")
    echo $args

    calculatePRS $args
    exit;
}

# parses the arguments for calculation
# then calls the scripts required for calculations
calculatePRS () {
    # parse arguments 
    traitsForCalc=()
    studyTypesForCalc=()
    studyIDsForCalc=()
    ethnicityForCalc=()
    isCondensedFormat=1

    single="'"
    escaped="\'"
    underscore="_"
    space=" "
    quote='"'
    empty=""

    # finds out which version of python is called using the 'python' command, uses the correct call to use python 3
    pyVer=""
    ver=$(python --version)
    read -a strarr <<< "$ver"

    # python version is 3.something, then use python as the call
    if [[ "${strarr[1]}" =~ ^3 ]]; then
        pyVer="python"
    else
        pyVer="python3"
    fi

    while getopts 'f:o:c:r:p:t:k:i:e:v:s:g:' c "$@"
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
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                elif ! [[ "${filename,,}" =~ .vcf$|.txt$ ]]; then
                    # check if the file is a valid zipped file (check getZippedFileExtension for more details)
                    zipExtension=`$pyVer -c "import calculate_score; calculate_score.getZippedFileExtension('$filename', True)"`
                    if [ "$zipExtension" = ".vcf" ] || [ "$zipExtension" = ".txt" ]; then
                        echo "zipped file validated"
                    # if "False", the file is not a zipped file
                    elif [ "$zipExtension" = "False" ]; then
                        echo -e "The file${LIGHTRED} $filename ${NC}is in the wrong format."
                        echo -e "Please use a vcf or txt file."
                        echo -e "${LIGHTRED}Quitting...${NC}"
                        exit 1
                    # if something else, the file is a zipped file, but there are too many/few vcf/txt files in it
                    else
                        # print the error associated with the zipped file and exit
                        echo $zipExtension
                        echo -e "${LIGHTRED}Quitting...${NC}"
                        exit 1
                    fi
                fi;;
            o)  if ! [ -z "$output" ]; then
                    echo "Too many output files given."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                output=$OPTARG
                if ! [[ "$output" =~ .csv$|.json$|.txt$ ]]; then
                    echo -e "${LIGHTRED}$output ${NC}is not in the right format."
                    echo -e "Valid formats are ${GREEN}csv${NC}, ${GREEN}json${NC}, and ${GREEN}txt${NC}"
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi;;
            c)  if ! [ -z "$cutoff" ]; then
                    echo "Too many p-value cutoffs given"
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                cutoff=$OPTARG
                if ! [[ "$cutoff" =~ ^[0-9]*(\.[0-9]+)?$ ]]; then
                    echo -e "${LIGHTRED}$cutoff ${NC}is your p-value, but it is not a number."
                    echo "Check the value and try again."
                    echo -e "${LIGHTRED}Quitting...${NC}"
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
                    echo -e "${LIGHTRED}$superPop ${NC}should be AFR, AMR, EAS, EUR, or SAS."
                    echo "Check the value and try again."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi;;

            t)  trait="${OPTARG//$single/$escaped}" # replace single quotes with escaped single quotes
                trait="${trait//$space/$underscore}"    # replace spaces with underscores
                trait="${trait//$quote/$empty}" # replace double quotes with nothing
                traitsForCalc+=("$trait");; #TODO still need to test this through the menu.. 
            k)  studyType=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
                if [ $studyType != "hi" ] && [ $studyType != "lc" ] && [ $studyType != "o" ]; then
                    echo "INVALID STUDY TYPE ARGUMENT. To filter by study type,"
                    echo "enter 'HI' for High Impact, 'LC' for Largest Cohort, or 'O' for Other."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                studyTypesForCalc+=("$studyType");;
            i)  studyIDsForCalc+=("$OPTARG");;
            e)  ethnicity="${OPTARG//$space/$underscore}"
                ethnicityForCalc+=("$ethnicity");;
            v)  verbose=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
                if [ $verbose == "true" ]; then
                    isCondensedFormat=0
                elif [ $verbose != "false" ]; then
                    echo "Invalid argument for -v. Use either true or false"
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi;;
            g)  if ! [ -z "$defaultSex" ]; then
                    echo "Too many default sexes requested at once."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                defaultSex=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
                if [ $defaultSex != 'f' ] && [ $defaultSex != 'm' ] && [ $defaultSex != 'female' ] && [ $defaultSex != 'male' ] ; then
                    echo "Invalid argument for -g. Use f, m, female, or male."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi;;
            s)  if ! [ -z "$step" ]; then 
                    echo "Too many steps requested at once."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                step=$OPTARG
                # if is not a number, or if it is a number less than 1 or greater than 2
                if (! [[ $step =~ ^[0-9]+$ ]]) || ([[ $step =~ ^[0-9]+$ ]] && ([[ $step -gt 2 ]] || [[ $step -lt 1 ]])); then 
                    echo -e "${LIGHTRED}$step ${NC}is not a valid step number input"
                    echo "Valid step numbers are 1 and 2"
                    echo -e "${LIGHTRED}Quitting...${NC}"
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
    # if no sex is specified, set to female
    if [ -z "$defaultSex" ]; then
        defaultSex="female"
    fi

    # preps variables for passing to python script
    export traits=${traitsForCalc[@]}
    export studyTypes=${studyTypesForCalc[@]}
    export studyIDs=${studyIDsForCalc[@]}
    export ethnicities=${ethnicityForCalc[@]}

    res=""

    # Creates a hash to put on the associations file if needed or to call the correct associations file
    fileHash=$(cksum <<< "${filename}${output}${cutoff}${refgen}${superPop}${traits}${studyTypes}${studyIDs}${ethnicities}${defaultSex}" | cut -f 1 -d ' ')
    requiredParamsHash=$(cksum <<< "${filename}${output}${cutoff}${refgen}${superPop}${defaultSex}" | cut -f 1 -d ' ')

    if [[ $step -eq 0 ]] || [[ $step -eq 1 ]]; then
        checkForNewVersion
        echo "Running PRSKB on $filename"

        # if zipExtension hasn't been instantiated yet, initialize it
        if [ -z "$zipExtension" ]; then
            zipExtension="NULL"
        fi
        # if the zip extension is valid, set extension to the zip extension, 
        # otherwise use Pyhton os.path.splitext to get the extension
        if [ $zipExtension = ".vcf" ] || [ $zipExtension = ".txt" ]; then
            extension="$zipExtension"
        else
            extension=$($pyVer -c "import os; f_name, f_ext = os.path.splitext('$filename'); print(f_ext);")
        fi

        # Calls a python function to get a list of SNPs and clumps from our Database
        # saves them to files
        # associations --> either allAssociations.txt OR associations_{fileHash}.txt
        # clumps --> {superPop}_clumps_{refGen}.txt
        if $pyVer -c "import connect_to_server as cts; cts.retrieveAssociationsAndClumps('$refgen','${traits}', '${studyTypes}', '${studyIDs}','$ethnicities', '$superPop', '$fileHash', '$extension', '$defaultSex')"; then
            echo "Got SNPs and disease information from PRSKB"
            echo "Got Clumping information from PRSKB"
        else
            echo -e "${LIGHTRED}AN ERROR HAS CAUSED THE TOOL TO EXIT... Quitting${NC}"
            exit;
        fi
    fi


    if [[ $step -eq 0 ]] || [[ $step -eq 2 ]]; then
        IFS='.'
        read -a outFile <<< "$output"
        outputType=${outFile[1]}
        IFS=' '

        echo "Calculating prs on $filename"
        #outputType="tsv" #this is the default
        #$1=inputFile $2=pValue $3=tsv $4=refGen $5=superPop $6=outputFile $7=outputFormat  $8=fileHash $9=requiredParamsHash $10=defaultSex
        FILE=".workingFiles/associations_${fileHash}.txt"
        
        if $pyVer run_prs_grep.py "$filename" "$cutoff" "$outputType" "$refgen" "$superPop" "$output" "$isCondensedFormat" "$fileHash" "$requiredParamsHash" "$defaultSex" "$traits" "$studyTypes" "$studyIDs" "$ethnicities"; then
            echo "Calculated score"
            echo "Results saved to $output"
        else
            echo -e "${LIGHTRED}ERROR DURING CALCULATION... Quitting${NC}"

        fi
        # if [[ $fileHash != $requiredParamsHash ]] && [[ -f "$FILE" ]]; then
        #     rm $FILE
        #     rm ".workingFiles/${superPop}_clumps_${refgen}_${fileHash}.txt"
        # fi
        # # TODO I've never tested this with running multiple iterations. I don't know if this is something that would negativly affect the tool
        # rm -r __pycache__
        # echo "Cleaned up intermediate files"
        # printf "Finished. Exiting...\n"
        exit;
    fi
}

checkForNewVersion () {
    newestVersion=$(curl -s "https://prs.byu.edu/cli_version") # checks the version on the
    
    # asks user if they want to download the newest version
    if [ "$newestVersion" != "" ] && [[ "$newestVersion" =~ ^[0-9]*(\.[0-9]+)?(\.[0-9]+)?$ ]] && [ "$newestVersion" != "$version" ]; then
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
calculatePRS "$@" 
