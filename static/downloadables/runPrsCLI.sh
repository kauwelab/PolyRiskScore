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
#       -v verbose output file
#       -s stepNumber
#
# * 12/9/2020 - v1.3.0
#
#   Added optional param:
#       -g biological sex prefered for snp selection
#       -n number of processes
#       -m omit *_studiesNotIncluded.txt file
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
#   4/20/21 - v1.6.0
#
#   Added option to upload GWAS data:
#       -u path to GWAS upload file
#       -a refGen of GWAS upload file
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
    echo -e "                   ${LIGHTBLUE}PRSKB Command-Line Menu/Instructions${NC}"
    echo -e "$HORIZONTALLINE"
    echo "Welcome to the PRSKB command-line menu. Here you can learn about the different" 
    echo "parameters required to run a polygenic risk score (PRS) calculation, search" 
    echo "for a specific study or diesease, display available ethnicities for filtering," 
    echo "view usage, or run the PRSKB calculator."
    echo ""
    echo "Select an option below by entering the corresponding number"
    echo "then pressing [Enter]."
}

# the usage statement of the tool
usage () {
    echo -e "${LIGHTBLUE}USAGE:${NC} \n"
    echo -e "./runPrsCLI.sh ${LIGHTRED}-f [VCF file path OR rsIDs:genotype file path] ${LIGHTBLUE}-o [output file path (tsv or json format)] ${LIGHTPURPLE}-c [p-value cutoff (ex: 0.05)] ${YELLOW}-r [refGen {hg17, hg18, hg19, hg38}] ${GREEN}-p [subject super population {AFR, AMR, EAS, EUR, SAS}]${NC}"
    echo ""
    echo -e "${MYSTERYCOLOR}Optional parameters to filter studies: "
    echo -e "   ${MYSTERYCOLOR}-t${NC} traitList ex. -t acne -t insomnia -t \"Alzheimer's disease\""
    echo -e "   ${MYSTERYCOLOR}-k${NC} studyType ex. -k HI -k LC -k O (High Impact, Large Cohort, Other studies)"
    echo -e "   ${MYSTERYCOLOR}-i${NC} studyIDs ex. -i GCST000727 -i GCST009496"
    echo -e "   ${MYSTERYCOLOR}-e${NC} ethnicity ex. -e European -e \"East Asian\"" 
    echo -e "${MYSTERYCOLOR}Additional Optional parameters: "
    echo -e "   ${MYSTERYCOLOR}-v${NC} verbose ex. -v (indicates a more detailed TSV result file. By default, JSON output will already be verbose.)"
    echo -e "   ${MYSTERYCOLOR}-g${NC} defaultSex ex. -g male -g female"
    echo -e "   ${MYSTERYCOLOR}-s${NC} stepNumber ex. -s 1 or -s 2"    
    echo -e "   ${MYSTERYCOLOR}-n${NC} number of subprocesses ex. -n 2 (By default, the calculations will be run on all available subprocesses)"
    echo -e "   ${MYSTERYCOLOR}-m${NC} omit *_studiesNotIncluded.txt file ex. -m (Indicates that the *_studiesNotIncluded.txt file should not be created)" 
    echo -e "   ${MYSTERYCOLOR}-u${NC} path to GWAS data to use for calculations. Data in file MUST be tab separated and include the correct columns (see ___)"
    echo -e "   ${MYSTERYCOLOR}-a${NC} reference genome used in the GWAS data file" 
    echo ""
}

# the options menu - prints the menu, waits for user input, and then directs them where they want to go
chooseOption () {
    while true
    do
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _"
        echo    "|                                                         |"
        echo -e "| ${LIGHTBLUE}Options Menu${NC}                                            |"
        echo -e "| ${LIGHTBLUE}1${NC} - Learn about Parameters                              |"
        echo -e "| ${LIGHTBLUE}2${NC} - Search for a specific study or trait                |"
        echo -e "| ${LIGHTBLUE}3${NC} - View available ethnicities for filter               |"
        echo -e "| ${LIGHTBLUE}4${NC} - View usage                                          |"
        echo -e "| ${LIGHTBLUE}5${NC} - Learn about uploading GWAS data for calculations    |"
        echo -e "| ${LIGHTBLUE}6${NC} - Run the PRSKB calculator                            |"
        echo -e "| ${LIGHTBLUE}7${NC} - Quit                                                |"
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) learnAboutParameters ;;
            2 ) searchTraitsAndStudies ;;
            3 ) printEthnicities ;;
            4 ) usage ;;
            5 ) learnAboutGWASupload ;;
            6 ) runPRS ;;
            7 ) echo -e " ${LIGHTRED}...Quitting...${NC}"
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
        echo -e "| ${LIGHTPURPLE}6${NC} - -t trait                                |"
        echo -e "| ${LIGHTPURPLE}7${NC} - -k studyType                            |"
        echo -e "| ${LIGHTPURPLE}8${NC} - -i studyID                              |"
        echo -e "| ${LIGHTPURPLE}9${NC} - -e ethnicity                            |"
        echo -e "| ${LIGHTPURPLE}10${NC} - -v verbose result file                 |"
        echo -e "| ${LIGHTPURPLE}11${NC} - -g defaultSex                          |"
        echo -e "| ${LIGHTPURPLE}12${NC} - -s stepNumber                          |"
        echo -e "| ${LIGHTPURPLE}13${NC} - -n number of subprocesses              |"
        echo -e "| ${LIGHTPURPLE}14${NC} - -m omit *_studiesNotIncluded.txt       |"
        echo -e "| ${LIGHTPURPLE}15${NC} - -u tab separated GWAS data file        |"
        echo -e "| ${LIGHTPURPLE}16${NC} - -a reference genome of GWAS data file  |"
        echo -e "|                                             |"
        echo -e "| ${LIGHTPURPLE}17${NC} - Done                                   |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _|"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) echo -e "${MYSTERYCOLOR}-f VCF File path or rsIDs:genotypes file path: ${NC}" 
                echo "The path to the VCF file that contains the samples for which you would like " 
                echo "the polygenic risk scores calculated. Alternativly, the path to a TXT file that"
                echo "contains rsIDs in the format of 1 rsID per line, with the genotypes following"
                echo "on the same line. (ex. rs6656401:AA or rs6656401:A)"
                echo "" ;;
            2 ) echo -e "${MYSTERYCOLOR}-o Output File path: ${NC}" 
                echo "The path to the file that will contain the final polygenic risk scores. The "
                echo -e "permitted extensions are ${GREEN}.tsv${NC} or ${GREEN}.json${NC} and will dictate the" 
                echo "format of the outputted results."
                echo "" ;;
            3 ) echo -e "${MYSTERYCOLOR}-c P-value Cutoff: ${NC}"
                echo "This parameter dictates which SNPs will be used in the PRS calculation. "
                echo "Those SNPs with p-values less than or equal to the given cutoff will be " 
                echo "included. "  
                echo "" ;;
            4 ) echo -e "${MYSTERYCOLOR}-r RefGen (Reference Genome): ${NC}"
                echo "This parameter tells us which reference genome was used to identify the variants " 
                echo -e "in the input VCF file. Available options are ${GREEN}hg17${NC}, ${GREEN}hg18${NC}, ${GREEN}hg19${NC}, and ${GREEN}hg38${NC}."
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
                echo "you would like to use to calculate PRS scores. You can search available "
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
                echo "   studies with the largest cohort are chosen with this option." 
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
                echo -e "For a more detailed TSV result file, include the ${GREEN}-v${NC} parameter."
                echo "The verbose output file will include the following for each corresponding sample, study, and trait combination: "
                echo ""
                echo "    - reported trait"
                echo "    - trait"
                echo "    - polygenic risk score"
                echo "    - protective variants"
                echo "    - risk variants"
                echo "    - variants that are present but do not include the risk allele"
                echo "    - variants that are in high linkage disequilibrium whose odds ratios are not included in the calculations"
                echo ""
                echo "If the output file is in TSV format and this parameter is not included, the default TSV result"
                echo "file will include the study ID and the corresponding polygenic risk scores for each sample." 
                echo "If the output file is in JSON format, the results will, by default, be in verbose format."
                echo -e "${LIGHTRED}**NOTE:${NC} There is no condensed version of JSON output."
                echo "" ;;
            11 ) echo -e "${MYSTERYCOLOR} -g defaultSex: ${NC}"
                echo "Though a rare occurence, some studies have duplicates of the same snp that differ by which"
                echo "biological sex the p-value is associated with. You can indicate which sex you would like snps"
                echo "to select when both options (M/F) are present. The system default is Female."
                echo "" ;;
            12 ) echo -e "${MYSTERYCOLOR} -s stepNumber: ${NC}"
                echo -e "Either ${GREEN}-s 1${NC} or ${GREEN}-s 2${NC}"
                echo "This parameter allows you to split up the running of the tool into two steps."
                echo "The advantage of this is that the first step, which requires internet, can be"
                echo "run separately from step 2, which does not require an internet connection."
                echo "" ;;
            13 ) echo -e "${MYSTERYCOLOR} -n number of subprocesses: ${NC}"
                echo "This parameter allows you to choose the number of processes used to run the tool."
                echo "By default, the Python script will run the calculations using all available nodes."
                echo "" ;;
            14 ) echo -e "${MYSTERYCOLOR} -m omit *_studiesNotIncluded.txt: ${NC}"
                echo -e "To omit the *_studiesNotIncluded.txt file, include the ${GREEN}-m${NC} parameter."
                echo "The *_studiesNotIncluded.txt file details study and trait combinations that no scores were"
                echo "calculated for, due to none of the study snps being present in the samples. "
                echo "" ;;
            15 ) echo -e "${MYSTERYCOLOR} -u tab separated GWAS data file path: ${NC}"
                echo "If you wish to calculate polygenic risk scores using your own GWAS data, use this"
                echo "parameter to specifiy the GWAS data file path. It must be a tab separated file."
                echo "For more information about file format, see the 'Learn about uploading GWAS data for calculations'"
                echo "option from the main menu."
                echo "" ;;
            16 ) echo -e "${MYSTERYCOLOR} -a reference genome of uploaded GWAS data: ${NC}"
                echo "This parameter tells us which reference genome was used to identify the variants " 
                echo -e "in the GWAS data file. Available options are ${GREEN}hg17${NC}, ${GREEN}hg18${NC}, ${GREEN}hg19${NC}, and ${GREEN}hg38${NC}."
                echo "If a GWAS data file is specified without this reference genome being specified, we assume the"
                echo "reference genome is the same as the one for the input VCF or TXT."
                echo "" ;;
            17 ) cont=0 ;;
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
                if curl -s https://prs.byu.edu/find_studies/${searchTerm} | jq -r 'sort_by(.citation) | .[] | .citation + " | " + .studyID + " | " + .reportedTrait + " | " + .trait + " | " + .title + "\n"'; then
                    echo ""
                else 
                    jqError "STUDIES"
                fi;;
        [tT]* ) read -p "Enter the search term you wish to use: " searchTerm 
                if [[ "$searchTerm" = *"'"* ]]; then
                    searchTerm=${searchTerm//${sub}/${backslash}${sub}}
                fi
                echo -e "${LIGHTPURPLE}"
                if curl -s https://prs.byu.edu/find_traits/${searchTerm} | jq -r '.[]'; then
                    echo -e "${NC}"
                else
                    echo -e "${NC}"
                    jqError "TRAITS"
                fi;;
        * ) echo -e "Invalid option." ;;
    esac
}

printEthnicities () {
    echo ""
    echo -e "${LIGHTPURPLE}PRINTING AVAILABLE ETHNICITES TO FILTER BY:${NC}"
    if curl -s https://prs.byu.edu/ethnicities | jq -r '.[]'; then
        echo -e ""
    else
        jqError "ETHNICITIES"
    fi
}

learnAboutGWASupload () {
    echo -e "${LIGHTPURPLE} UPLOADING GWAS DATA FOR PRS CALCULATIONS${NC}"
    echo ""
    echo "The PRSKB CLI polygenic risk score calculator has the option of calculating \
risk scores for GWAS data supplied by the user. The GWAS data file must be \
correctly formatted for calculations to occur. "
    echo ""
    echo -e "The file must be a ${MYSTERYCOLOR}tab separated${NC} .tsv or .txt file. It must \
include a header line with named columns. The required columns are: ${MYSTERYCOLOR}Study ID${NC}, \
${MYSTERYCOLOR}Trait${NC}, ${MYSTERYCOLOR}Rsid${NC}, ${MYSTERYCOLOR}Chromosome${NC}, ${MYSTERYCOLOR}Position${NC}, \
${MYSTERYCOLOR}Risk Allele${NC}, ${MYSTERYCOLOR}Odds Ratio${NC}, and ${MYSTERYCOLOR}P-value${NC}. \
Optional column headers that will be included if present are: ${MYSTERYCOLOR}Citation${NC} and \
${MYSTERYCOLOR}Reported Trait${NC}. Column order does not matter and there may be extra columns \
present in the file. Required and optional header names must be exact."
    echo ""
    echo "If more than one odds ratio exists for an Rsid in a study, the odds ratio and corresponding risk allele \
with the most significant p-value will be used. Additonally, though we perform strand flipping on GWAS summary statistics \
data we use from the GWAS Catalog, we do not perform strand flipping on uploaded data. Please ensure that your \
data is presented on the correct strand."
    echo ""
    echo -e "${LIGHTRED}NOTE: If a GWAS data file is specified, risk scores will only be calculated on \
that data. No association data from the PRSKB will be used. Additionally, the optional params \
${MYSTERYCOLOR}-t${LIGHTRED}, ${MYSTERYCOLOR}-k${LIGHTRED}, ${MYSTERYCOLOR}-i${LIGHTRED}, ${MYSTERYCOLOR}-e${LIGHTRED}, \
and ${MYSTERYCOLOR}-g${LIGHTRED} will be ignored.${NC}"
    echo ""
    echo "Choose a column header below to learn more about it or select 'Return To Main Menu'."
    echo ""

    cont=1
    
    while [[ "$cont" != "0" ]]
    do 
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ "
        echo    "|                              |"
        echo -e "|${LIGHTPURPLE}REQUIRED COLUMNS: ${NC}            |"
        echo -e "| ${LIGHTPURPLE}1${NC} - Study ID                 |"
        echo -e "| ${LIGHTPURPLE}2${NC} - Trait                    |"
        echo -e "| ${LIGHTPURPLE}3${NC} - Rsid                     |"
        echo -e "| ${LIGHTPURPLE}4${NC} - Chromosome               |"
        echo -e "| ${LIGHTPURPLE}5${NC} - Position                 |"
        echo -e "| ${LIGHTPURPLE}6${NC} - Risk Allele              |"
        echo -e "| ${LIGHTPURPLE}7${NC} - Odds Ratio               |"
        echo -e "| ${LIGHTPURPLE}8${NC} - P-value                  |"
        echo    "|                              |"
        echo -e "|${LIGHTPURPLE}OPTIONAL COLUMNS: ${NC}            |"
        echo -e "| ${LIGHTPURPLE}9${NC} - Citation                 |"
        echo -e "| ${LIGHTPURPLE}10${NC} - Reported Trait          |"
        echo -e "|                              |"
        echo -e "| ${LIGHTPURPLE}11${NC} - Return To Main Menu     |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ |"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) echo -e "${MYSTERYCOLOR} Study ID: ${NC}" 
                echo "A unique study identifyer. In our database, we use GWAS Catalog study identifiers. As long as this is unique for each study, it can be whatever you want."
                echo "" ;;
            2 ) echo -e "${MYSTERYCOLOR} Trait: ${NC}" 
                echo "The Experimental Factor Ontology (EFO) trait the GWAS deals with."
                echo "" ;;
            3 ) echo -e "${MYSTERYCOLOR} Rsid: ${NC}"
                echo "The Reference SNP cluster ID (Rsid) of the SNP."
                echo "" ;;
            4 ) echo -e "${MYSTERYCOLOR} Chromosome: ${NC}"
                echo "The chromosome the SNP resides on."
                echo "" ;;
            5 ) echo -e "${MYSTERYCOLOR} Position: ${NC}"
                echo "The position of the SNP in the reference genome."
                echo "" ;;
            6 ) echo -e "${MYSTERYCOLOR} Risk Allele: ${NC}"
                echo "The allele that confers risk or protection."
                echo "" ;;
            7 ) echo -e "${MYSTERYCOLOR} Odds Ratio: ${NC}"
                echo "Computed in the GWAS study, a numerical value of the odds that those in the case group have the allele of interest over the odds that those in the control group have the allele of interest."
                echo "" ;;
            8 ) echo -e "${MYSTERYCOLOR} P-value: ${NC}"
                echo "The probability that the risk allele confers the amount of risk stated."
                echo "" ;;
            9 ) echo -e "${MYSTERYCOLOR} Citation: ${NC}"
                echo "The citation information for the study."
                echo "" ;;
            10 ) echo -e "${MYSTERYCOLOR} Reported Trait: ${NC}"
                echo "Trait description for this study in the authors own words."
                echo "" ;;
            11 ) cont=0 ;;
            * ) echo "INVALID OPTION";;
        esac
        if [[ "$cont" != "0" ]]; then
            read -p "Return to GWAS Columns? (y/n) " returnToParams
            echo ""
            case $returnToParams in 
                [yY]* ) ;;
                * ) cont=0;;
            esac
        fi
    done 
}

jqError () {
    typeOfQuery=$1
    echo -e ""
    echo -e "${LIGHTRED}ERROR: CANNOT PRINT ${typeOfQuery}${NC}"
    echo "In order to use this functionality, you need to have jq downloaded."
    echo -e "You can install it using ${MYSTERYCOLOR}sudo apt-get install jq${NC} on Ubuntu/Debian or go to \
${MYSTERYCOLOR}https://stedolan.github.io/jq/download/ ${NC}to download and install it for other OS."
    echo -e ""
}

# will allow the user to run the PRSKB calculator from the menu
# takes in the required params, then passes to calculatePRS
runPRS () {
    echo -e "${LIGHTBLUE}RUN THE PRSKB CALCULATOR:${NC}"
    echo "The calculator will run and then the program will exit. Enter the parameters \
as you would if you were running the program without opening the menu. The \
usage is given below for your convenience (You don't need to include ./runPrsCLI.sh) "
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
    omitUnusedStudiesFile=0

    single="'"
    escaped="\'"
    underscore="_"
    space=" "
    quote='"'
    empty=""

    # finds out which version of python is called using the 'python' command, uses the correct call to use python 3
    pyVer=""
    ver=$(python --version 2>&1)
    read -a strarr <<< "$ver"

    # if python version isn't blank and is 3.something, then use python as the call
    if ! [ -z "${strarr[1]}" ] && [[ "${strarr[1]}" =~ ^3 ]]; then
        pyVer="python"
    # if python3 doesn't error, use python3 as the call
    elif python3 --version >/dev/null 2>&1; then
        pyVer="python3"
    else
        echo -e "${LIGHTRED}ERROR: PYTHON3 NOT INSTALLED."
        echo -e "python3 is required to run this script. Please install it and try again."
        echo -e "Quitting...${NC}"
        exit 1
    fi

    # create python import paths
    SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"

    while getopts 'f:o:c:r:p:t:k:i:e:vs:g:n:mu:a:' c "$@"
    do 
        case $c in 
            f)  if ! [ -z "$filename" ]; then
                    echo "Too many filenames given at once."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                filename=$OPTARG
                filename="${filename//\\//}" # replace backslashes with forward slashes
                if [ ! -f "$filename" ]; then
                    echo -e "The file${LIGHTRED} $filename ${NC}does not exist."
                    echo "Check the path and try again."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                elif ! [[ $(echo $filename | tr '[:upper:]' '[:lower:]') =~ .vcf$|.txt$ ]]; then
                    # check if the file is a valid zipped file (check getZippedFileExtension for more details)
                    zipExtension=`$pyVer "$SCRIPT_DIR/grep_file.py" "zip" "$filename" "True" "False"`
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
                output=$(echo $OPTARG | tr '[:upper:]' '[:lower:]')
                output="${output//\\//}" # replace backslashes with forward slashes
                if ! [[ "${output}" =~ .tsv$|.json$ ]]; then
                    echo -e "${LIGHTRED}$output ${NC} is not in the right format."
                    echo -e "Valid formats are ${GREEN}tsv${NC} and ${GREEN}json${NC}"
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
                refgen=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
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
                superPop=$(echo "$OPTARG" | tr '[:lower:]' '[:upper:]') 
                if ! [[ "$superPop" =~ ^AFR$|^AMR$|^EAS$|^EUR$|^SAS$ ]]; then
                    echo -e "${LIGHTRED}$superPop ${NC}should be AFR, AMR, EAS, EUR, or SAS."
                    echo "Check the value and try again."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi;;

            t)  trait=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]') # convert trait to lower case
                trait="${trait//$single/$escaped}" # replace single quotes with escaped single quotes
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
            v)  isCondensedFormat=0
                ;;
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
            n)  if ! [ -z "$processes" ]; then 
                    echo "Too many subprocess arguments requested at once."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                processes=$OPTARG
                # if is not a number, or if it is a number less than 1
                if (! [[ $processes =~ ^[0-9]+$ ]]) || ([[ $processes =~ ^[0-9]+$ ]] && [[ $processes -lt 0 ]]); then 
                    echo -e "${LIGHTRED}$processes ${NC}is not a valid input for the number of subprocesses"
                    echo "The number of subprocesses cannot be less than 0"
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi;;
            m)  omitUnusedStudiesFile=1
                ;;
            u)  if ! [ -z "$GWASfilename" ]; then
                    echo "Too many GWAS filenames given at once."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                GWASfilename=$OPTARG
                GWASfilename="${GWASfilename//\\//}" # replace backslashes with forward slashes
                if [ ! -f "$GWASfilename" ]; then
                    echo -e "The file${LIGHTRED} $GWASfilename ${NC}does not exist."
                    echo "Check the path and try again."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                elif ! [[ $(echo $GWASfilename | tr '[:upper:]' '[:lower:]') =~ .tsv$|.txt$ ]]; then
                    # check if the file is a valid zipped file (check getZippedFileExtension for more details)
                    GWASzipExtension=`$pyVer "$SCRIPT_DIR/grep_file.py" "zip" "$GWASfilename" "True" "True"`
                    if [ "$GWASzipExtension" = ".tsv" ] || [ "$GWASzipExtension" = ".txt" ]; then
                        echo "zipped file validated"
                    # if "False", the file is not a zipped file
                    elif [ "$GWASzipExtension" = "False" ]; then
                        echo -e "The file${LIGHTRED} $GWASfilename ${NC}is in the wrong format."
                        echo -e "Please use a tsv or a tab separated txt file."
                        echo -e "${LIGHTRED}Quitting...${NC}"
                        exit 1
                    # if something else, the file is a zipped file, but there are too many/few tsv/txt files in it
                    else
                        # print the error associated with the zipped file and exit
                        echo $GWASzipExtension
                        echo -e "${LIGHTRED}Quitting...${NC}"
                        exit 1
                    fi
                fi
                useGWAS="True";;
            a)  if ! [ -z "$GWASrefgen" ]; then
                    echo "Too many GWAS reference genomes given."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                GWASrefgen=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
                if ! [[ "$GWASrefgen" =~ ^hg17$|^hg18$|^hg19$|^hg38$ ]]; then
                    echo -e "${LIGHTRED}$GWASrefgen ${NC}should be hg17, hg18, hg19, or hg38"
                    echo "Check the value and try again."
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
    # if no GWAS refgen is specified but a path to a gwas file is give, set GWASrefgen to the samples refgen
    if [ -z "${GWASrefgen}" ] && ! [ -z "${GWASfilename}" ]; then
        GWASrefgen=${refgen}
    fi

    # preps variables for passing to python script
    export traits=${traitsForCalc[@]}
    export studyTypes=${studyTypesForCalc[@]}
    export studyIDs=${studyIDsForCalc[@]}
    export ethnicities=${ethnicityForCalc[@]}

    # Creates a hash to put on the associations file if needed or to call the correct associations file
    fileHash=$(cksum <<< "${filename}${output}${cutoff}${refgen}${superPop}${traits}${studyTypes}${studyIDs}${ethnicities}${defaultSex}" | cut -f 1 -d ' ')
    if ! [ -z ${GWASfilename} ]; then
        fileHash=$(cksum <<< "${filename}${output}${cutoff}${refgen}${superPop}${GWASfilename}${GWASrefgen}" | cut -f 1 -d ' ')
    fi
    requiredParamsHash=$(cksum <<< "${filename}${output}${cutoff}${refgen}${superPop}${defaultSex}" | cut -f 1 -d ' ')
    # Create uniq ID for filtered file path
    TIMESTAMP=`date "+%Y-%m-%d_%H-%M-%S-%3N"` 
    
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

    # if GWAS file is present and GWASzipExtension hasn't been instantiated yet, initialize it
    if ! [ -z "${GWASfilename}" ]; then
        if [ -z "$GWASzipExtension" ]; then
            GWASzipExtension="NULL"
        fi
        # if the zip extension is valid, set extension to the zip extension, 
        # otherwise use Pyhton os.path.splitext to get the extension
        if [ $GWASzipExtension = ".tsv" ] || [ $GWASzipExtension = ".txt" ]; then
            GWASextension="$GWASzipExtension"
        else
            GWASextension=$($pyVer -c "import os; f_name, f_ext = os.path.splitext('$GWASfilename'); print(f_ext);")
        fi
    fi

    if [[ $step -eq 0 ]] || [[ $step -eq 1 ]]; then
        # check if pip is installed for the python call being used (REQUIRED)
        if ! $pyVer -m pip --version >/dev/null 2>&1; then
            echo -e "${LIGHTRED}ERROR: PIP NOT INSTALLED."
            echo -e "pip for $pyVer is required to run this script. Please install it and try again."
            echo -e "Quitting...${NC}"
            exit 1
        # check that all required packages are installed
        else
            echo "Checking for PyVCF package requirement"
            {
                $pyVer -c "import vcf" >/dev/null 2>&1
            } && {
                echo -e "PyVCF package requirement met\n"
            } || {
                {
                    echo "Missing package requirement: PyVCF"
                    echo "Attempting download"
                } && {
                    $pyVer -m pip install PyVCF
                } && {
                    echo -e "Download successful, Package requirement met\n"
                } || {
                    echo "Failed to download the required package."
                    echo "Please manually download this package (PyVCF) and try running the tool again."
                    exit 1
                }
            }
            echo "Checking for filelock package requirement"
            {
                $pyVer -c "from filelock import FileLock" >/dev/null 2>&1
            } && {
                echo -e "filelock package requirement met\n"
            } || {
                {
                    echo "Missing package requirement: filelock"
                    echo "Attempting download"
                } && {
                    $pyVer -m pip install filelock
                } && {
                    echo -e "Download successful, Package requirement met\n"
                } || {
                    echo "Failed to download the required package."
                    echo "Please manually download this package (filelock) and try running the tool again."
                    exit 1
                }
            }

            echo "Checking for requests package requirement"
            {
                $pyVer -c "import requests" >/dev/null 2>&1
            } && {
                echo -e "requests package requirement met\n"
            } || {
                {
                    echo "Missing package requirement: requests"
                    echo "Attempting download"
                } && {
                    $pyVer -m pip install requests
                } && {
                    echo -e "Download successful, Package requirement met\n"
                } || {
                    echo "Failed to download the required package."
                    echo "Please manually download this package (requests) and try running the tool again."
                    exit 1
                }
            }
            echo "All package requirements met"
        fi

        checkForNewVersion
        echo "Running PRSKB on $filename"

        if ! [ -z "${GWASfilename}" ]; then 
            # Calls a python function to format the given GWAS data and get the clumps from our database
            # saves both to files
            # GWAS data --> GWASassociations_{fileHash}.txt
            # clumps --> {superPop}_clumps_{refGen}_{fileHash}.txt
            if $pyVer "${SCRIPT_DIR}/connect_to_server.py" "GWAS" "${GWASfilename}" "${GWASextension}" "${GWASrefgen}" "${refgen}" "${superPop}" "${fileHash}"; then
                echo "Formatted GWAS data and retrieved clumping information from the PRSKB"
            else
                echo -e "${LIGHTRED}AN ERROR HAS CAUSED THE TOOL TO EXIT... Quitting${NC}"
                exit;
            fi
        else 
            # Calls a python function to get a list of SNPs and clumps from our Database
            # saves them to files
            # associations --> either allAssociations.txt OR associations_{fileHash}.txt
            # clumps --> {superPop}_clumps_{refGen}.txt OR {superPop}_clumps_{refGen}_{fileHash}.txt
            if $pyVer "${SCRIPT_DIR}/connect_to_server.py" "$refgen" "${traits}" "${studyTypes}" "${studyIDs}" "$ethnicities" "$superPop" "$fileHash" "$extension" "$defaultSex"; then
                echo "Got SNPs and disease information from PRSKB"
                echo "Got Clumping information from PRSKB"
            else
                echo -e "${LIGHTRED}AN ERROR HAS CAUSED THE TOOL TO EXIT... Quitting${NC}"
                exit;
            fi
        fi
    fi


    if [[ $step -eq 0 ]] || [[ $step -eq 2 ]]; then
        outputType=$($pyVer -c "import os; f_name, f_ext = os.path.splitext('$output'); print(f_ext.lower());")
        outputName=$($pyVer -c "import os; f_name, f_ext = os.path.splitext('$output'); print(f_name);")

        echo "Calculating prs on $filename"
        FILE="${SCRIPT_DIR}/.workingFiles/associations_${fileHash}.txt"
        if ! [ -z "${GWASfilename}" ]; then 
            FILE="${SCRIPT_DIR}/.workingFiles/GWASassociations_${fileHash}.txt"
        fi

        # filter the input file so that it only includes the lines with variants that match the given filters
        if $pyVer "${SCRIPT_DIR}/grep_file.py" "$filename" "$fileHash" "$requiredParamsHash" "$superPop" "$refgen" "$defaultSex" "$cutoff" "${traits}" "${studyTypes}" "${studyIDs}" "$ethnicities" "$extension" "$TIMESTAMP" "$useGWAS"; then
            echo "Filtered input file"
            # parse through the filtered input file and calculate scores for each given study
            if $pyVer "${SCRIPT_DIR}/parse_associations.py" "$filename" "$fileHash" "$requiredParamsHash" "$superPop" "$refgen" "$defaultSex" "$cutoff" "$extension" "$output" "$outputType" "$isCondensedFormat" "$omitUnusedStudiesFile" "$TIMESTAMP" "$processes" "$useGWAS"; then
                echo "Parsed through genotype information"
                echo "Calculated score"
            else
                echo -e "${LIGHTRED}ERROR DURING CALCULATION... Quitting${NC}" 
            fi
        else
            echo -e "${LIGHTRED}ERROR DURING CREATION OF FILTERED INPUT FILE... Quitting${NC}"
        fi

        if [[ $fileHash != $requiredParamsHash ]] && [[ -f "$FILE" ]]; then
            rm "$FILE"
            rm "${SCRIPT_DIR}/.workingFiles/${superPop}_clumps_${refgen}_${fileHash}.txt"
            rm "${SCRIPT_DIR}/.workingFiles/traitStudyIDToSnps_${fileHash}.txt"
            rm "${SCRIPT_DIR}/.workingFiles/clumpNumDict_${refgen}_${fileHash}.txt" 
        fi
        
        [ -e "${SCRIPT_DIR}/.workingFiles/filteredInput_${TIMESTAMP}${extension}" ] && rm -- "${SCRIPT_DIR}/.workingFiles/filteredInput_${TIMESTAMP}${extension}"
        [ -d "${SCRIPT_DIR}/__pycache__" ] && rm -r "${SCRIPT_DIR}/__pycache__"
        [ -e "${SCRIPT_DIR}/$output.lock" ] && rm -- "${SCRIPT_DIR}/$output.lock"
        [ -e "${SCRIPT_DIR}/${outputName}_studiesNotIncluded.txt.lock" ] && rm -- "${SCRIPT_DIR}/${outputName}_studiesNotIncluded.txt.lock"
        echo "Cleaned up intermediate files"
        echo -e "Finished. Exiting...\n\n"
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
if [[ "$1" =~ "--version" ]] || [[ "$1" =~ "-v" ]] && [[ -z $2 ]]; then 
    echo -e "Running version ${version}"
    checkForNewVersion
    exit 1
fi

# pass arguments to calculatePRS
calculatePRS "$@" 
