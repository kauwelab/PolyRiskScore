#!/bin/bash

# ########################################################################
# 
version="1.7.0"
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
#
#   6/28/21 - v1.7.0
#
#   Exclude duplicated snps and sex-based snps unless sex-based snps are requested (-g parameter)
#
#
#   11/10/2021
#
#   added in handling for pvalue annotations and beta values
#   switching how the sex (-g) param functions
#   adding in maf handling (-q)
#
#
#   2/16/2022
#
#   added in a flag to omit percentiles from the output (-m)
#   added a parameter to set a cutoff value for minor allele frequencies (-x)
#
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
    echo -e "./runPrsCLI.sh ${LIGHTRED}-f [VCF file path OR rsIDs:genotype file path] ${LIGHTBLUE}-o [output file path (tsv or json format)] ${LIGHTPURPLE}-c [p-value cutoff (ex: 0.05)] ${YELLOW}-r [refGen {hg17, hg18, hg19, hg38}] ${GREEN}-p [preferred GWA study super population {AFR, AMR, EAS, EUR, SAS}]${NC}"
    echo ""
    echo -e "${MYSTERYCOLOR}Optional parameters to filter studies: "
    echo -e "   ${MYSTERYCOLOR}-t${NC} traitList ex. -t acne -t insomnia -t \"Alzheimer's disease\""
    echo -e "   ${MYSTERYCOLOR}-k${NC} studyType ex. -k HI -k LC -k O (High Impact, Large Cohort, Other studies)"
    echo -e "   ${MYSTERYCOLOR}-i${NC} studyIDs ex. -i GCST000727 -i GCST009496"
    echo -e "   ${MYSTERYCOLOR}-e${NC} ethnicity ex. -e European -e \"East Asian\"" 
    echo -e "   ${MYSTERYCOLOR}-y${NC} value type ex. -y beta -y \"Odds Ratio\""
    echo -e "   ${MYSTERYCOLOR}-g${NC} sex in study ex. -g male -g female -g exclude"
    echo -e "${MYSTERYCOLOR}Additional Optional parameters: "
    echo -e "   ${MYSTERYCOLOR}-v${NC} verbose ex. -v (indicates a more detailed TSV result file. By default, JSON output will already be verbose.)"
    echo -e "   ${MYSTERYCOLOR}-s${NC} stepNumber ex. -s 1 or -s 2"    
    echo -e "   ${MYSTERYCOLOR}-n${NC} number of subprocesses ex. -n 2 (By default, the calculations will be run on all available subprocesses)"
    echo -e "   ${MYSTERYCOLOR}-u${NC} path to GWAS data to use for calculations. Data in file MUST be tab separated and include the correct columns (see 'Learn about uploading GWAS data for calculations' or the CLI readme)"
    echo -e "   ${MYSTERYCOLOR}-a${NC} reference genome used in the GWAS data file"
    echo -e "   ${MYSTERYCOLOR}-b${NC} indicates that the user uploaded GWAS data uses beta coefficent values instead of odds ratios" 
    echo -e "   ${MYSTERYCOLOR}-q${NC} sets the minor allele frequency cohort to be used (also is the cohort used for reporting percentiles) ex. -q adni-ad (see the menu to learn more about the cohorts available)"
    echo -e "   ${MYSTERYCOLOR}-m${NC} omits reporting percentiles"
    echo -e "   ${MYSTERYCOLOR}-x${NC} sets the cutoff minor allele frequency value"
    echo -e "   ${MYSTERYCOLOR}-l${NC} individual-specific LD clumping ex. -l" 
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
        echo    " _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _"
        echo    "|                                                                 |"
        echo -e "|${LIGHTPURPLE}REQUIRED PARAMS: ${NC}                                                |"
        echo -e "| ${LIGHTPURPLE}1${NC} - -f VCF File, VCF chromosome files, or rsIDs:genotypes file  |"
        echo -e "| ${LIGHTPURPLE}2${NC} - -o Output file                                              |"
        echo -e "| ${LIGHTPURPLE}3${NC} - -c P-value Cutoff                                           |"
        echo -e "| ${LIGHTPURPLE}4${NC} - -r RefGen                                                   |"
        echo -e "| ${LIGHTPURPLE}5${NC} - -p Preferred GWA Study Super Population                     |"
        echo    "|                                                                 |"
        echo -e "|${LIGHTPURPLE}OPTIONAL PARAMS: ${NC}                                                |"
        echo -e "| ${LIGHTPURPLE}6${NC} - -t trait                                                    |"
        echo -e "| ${LIGHTPURPLE}7${NC} - -k studyType                                                |"
        echo -e "| ${LIGHTPURPLE}8${NC} - -i studyID                                                  |"
        echo -e "| ${LIGHTPURPLE}9${NC} - -e ethnicity                                                |"
        echo -e "| ${LIGHTPURPLE}10${NC} - -y value type                                              |"
        echo -e "| ${LIGHTPURPLE}11${NC} - -g sex dependent associations                              |"
        echo -e "| ${LIGHTPURPLE}12${NC} - -v verbose result file                                     |"
        echo -e "| ${LIGHTPURPLE}13${NC} - -s stepNumber                                              |"
        echo -e "| ${LIGHTPURPLE}14${NC} - -n number of subprocesses                                  |"
        echo -e "| ${LIGHTPURPLE}15${NC} - -u tab separated GWAS data file                            |"
        echo -e "| ${LIGHTPURPLE}16${NC} - -a reference genome of GWAS data file                      |"
        echo -e "| ${LIGHTPURPLE}17${NC} - -b flag indicates beta values used for uploaded GWAS data  |"
        echo -e "| ${LIGHTPURPLE}18${NC} - -q minor allele frequency cohort                           |"
        echo -e "| ${LIGHTPURPLE}19${NC} - -m omit percentiles from output                            |"
        echo -e "| ${LIGHTPURPLE}20${NC} - -x cutoff value for minor allele frequency                 |"
        echo -e "| ${LIGHTPURPLE}21${NC} - -l individual-specific LD clumping                         |"
        echo -e "|                                                                 |"
        echo -e "| ${LIGHTPURPLE}22${NC} - Done                                                       |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _|"

        # gets the inputted number from the user
        read -p "#? " option
        echo ""

        case $option in 
            1 ) echo -e "${MYSTERYCOLOR}-f VCF File path or rsIDs:genotypes file path: ${NC}" 
                echo "The path to the VCF file that contains the samples for which you would like " 
                echo "the polygenic risk scores calculated. Alternativly, the path to a TXT file that"
                echo "contains rsIDs in the format of 1 rsID per line, with the genotypes following"
                echo "on the same line. (ex. rs6656401:AA or rs6656401:A)"
                echo ""
                echo "Additionally, VCF files separated into chromosomes are allowed, using Bash Expansion."
                echo "(ex. '/path/to/file_chr*.vcf' )"
                echo "To use this method, you must enclose it in single (') or double (\") quotes. All "
                echo "VCFs must have the same headers. If the files are compressed, they must all be "
                echo "compressed in the same manner. "
                echo ""
                echo "File names/directories should not contain spaces."
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
                echo ""
                echo -e "${LIGHTRED}**NOTE:${NC} This parameter is not required for .txt files and will be defaulted to ${GREEN}hg38${NC} in that case if the user does not select a refGen." 
                echo "" ;;
            5 ) echo -e "${MYSTERYCOLOR}-p Preferred GWA Study Super Population: ${NC}"
	    #TODO: write a better explanation for this section
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
            10 ) echo -e "${MYSTERYCOLOR} -y value type: ${NC}"
                echo "This parameter allows you to filter studies by the value type reported"
                echo "by the study's authors (beta values or odds ratios)." 
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            11 ) echo -e "${MYSTERYCOLOR} -v verbose: ${NC}"
                echo -e "For a more detailed TSV result file, include the ${GREEN}-v${NC} flag."
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
            12 ) echo -e "${MYSTERYCOLOR} -g sex dependent associations: ${NC}"
                echo "A rare handful of studies report beta values or odds ratios dependent on biological sex."
                echo "Users can filter studies that contain these associations by selecting either male (M) or female (F)."
                echo "To exclude studies that contain values associated with sex, users can use exclude (e)."
                echo -e "${LIGHTRED}**NOTE:${NC} This does not affect studies selected by studyID." 
                echo "" ;;
            13 ) echo -e "${MYSTERYCOLOR} -s stepNumber: ${NC}"
                echo -e "Either ${GREEN}-s 1${NC} or ${GREEN}-s 2${NC}"
                echo "This parameter allows you to split up the running of the tool into two steps."
                echo "The advantage of this is that the first step, which requires internet, can be"
                echo "run separately from step 2, which does not require an internet connection."
                echo "" ;;
            14 ) echo -e "${MYSTERYCOLOR} -n number of subprocesses: ${NC}"
                echo "This parameter allows you to choose the number of processes used to run the tool."
                echo "By default, the Python script will run the calculations using all available nodes."
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
            17 ) echo -e "${MYSTERYCOLOR} -b beta values used for uploaded GWAS data: ${NC}"
                echo "This flag indicates that beta coefficents were used in the uploaded GWAS data" 
                echo "file instead of odds ratios. The beta values will first be converted to odds ratios and then"
                echo "those values will be used to calculate polygenic risk scores."
                echo "" ;;
            18 ) echo -e "${MYSTERYCOLOR} -q minor allele frequency cohort: ${NC}"
                echo "This parameter allows the user to select the cohort to use for minor allele frequencies and " 
                echo "also indicates the cohort to use for reporting percentile rank. Available options are:"
                echo -e "${GREEN}ukbb${NC} (UK Biobank, default)"
                echo -e "${GREEN}adni-ad${NC} (ADNI Alzheimer's disease)"
                echo -e "${GREEN}adni-mci${NC} (ADNI Mild cognitive impairment)"
                echo -e "${GREEN}adni-cn${NC} (ADNI Cognitively normal)"
                echo -e "${GREEN}afr${NC} (1000 Genomes African)"
                echo -e "${GREEN}amr${NC} (1000 Genomes American)"
                echo -e "${GREEN}eas${NC} (1000 Genomes East Asian)"
                echo -e "${GREEN}eur${NC} (1000 Genomes European)"
                echo -e "${GREEN}sas${NC} (1000 Genomes South Asian)"
                echo ""
                echo -e "To use the minor allele frequencies from the user vcf, use ${GREEN}-q user ${NC}."
                echo "Note that this option will not report percentile rank."
                echo "" ;;
            19 ) echo -e "${MYSTERYCOLOR} -m omit percentiles from output: ${NC}"
                echo "This flag allows the user to remove the Percentile column/property from the verbose output file."
                echo ""
                echo -e "${LIGHTRED}**NOTE:${NC} Percentiles will automatically be omitted from outputs using the GWAS upload option."
                echo "" ;;
            20 ) echo -e "${MYSTERYCOLOR} -x cutoff for minor allele frequency: ${NC}"
                echo "This parameter allows the user to select a cutoff for minor allele frequencies."
                echo "Risk alleles with a frequency below the threshold will not be used in calculations."
                echo "" ;;
            21 ) echo -e "${MYSTERYCOLOR} -l individual-specific LD clumping: ${NC}"
                echo "To perform linkage disequilibrium clumping on an individual level, include the -l parameter."
                echo "By default, LD clumping is performed on a sample-wide basis, where"
                echo "the variants included in the clumping process are the same for each individual, based off of all the variants that are present in the GWA study."
                echo "This type of LD clumping is beneficial because it allows for sample-wide PRS comparisons"
                echo "since each risk score is calculated using the same variants."
                echo "In contrast, individual-wide LD clumping determines the variants to be used in the PRS calculation"
                echo "by only looking at the individual's variants that have a corresponding risk allele" 
                echo  "(or, in the absence of a risk allele, an imputed unknown allele) in the GWA study."
                echo "The benefit to this type of LD clumping is that it allows for a greater number of risk alleles"
                echo "to be included in each individual's polygenic risk score."
                echo "" ;;
            22 ) cont=0 ;;
            * ) echo "INVALID OPTION";;
        esac
        if [[ "$cont" != "0" ]]; then
            # ask if the user wants to look at more of the params
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
                echo "" 
                echo -e "${LIGHTPURPLE}First Author and Year | GWAS Catalog Study ID | Reported Trait | Trait | Original Value Type | Title${NC}"
                if curl -s https://prs.byu.edu/find_studies/${searchTerm} | jq -r 'sort_by(.citation) | .[] | .citation + " | " + .studyID + " | " + .reportedTrait + " | " + .trait + " | " + .ogValueType + " | " + .title + "\n"'; then
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
${MYSTERYCOLOR}Trait${NC}, ${MYSTERYCOLOR}RsID${NC}, ${MYSTERYCOLOR}Chromosome${NC}, ${MYSTERYCOLOR}Position${NC}, \
${MYSTERYCOLOR}Risk Allele${NC}, ${MYSTERYCOLOR}Odds Ratio${NC}, and ${MYSTERYCOLOR}P-value${NC}. \
If the ${GREEN}-b${NC} flag is present, then instead of an ${MYSTERYCOLOR}Odds Ratio${NC} column, \
the user should include a ${MYSTERYCOLOR}Beta Coefficient${NC} column and a ${MYSTERYCOLOR}Beta Unit${NC} column. \
Optional column headers that will be included if present are: ${MYSTERYCOLOR}Citation${NC}, ${MYSTERYCOLOR}P-value Annotation${NC}, \
${MYSTERYCOLOR}Beta Annotation${NC}, and ${MYSTERYCOLOR}Reported Trait${NC}. Column order does not matter and there may be extra columns \
present in the file. Required and optional header names must be exact. Note that if P-value Annotation and/or Beta Annotation \
are present, then the calculator will separate calculations by those columns. If you do not wish for this to \
happen, do not include those optional columns."
    echo ""
    echo "If more than one odds ratio exists for an RsID in a study/trait combination, the program will notify the user and stop running. \ 
To avoid this, please ensure that you do not have any duplicated snps."
    echo ""
    echo -e "${LIGHTRED}NOTE: If a GWAS data file is specified, risk scores will only be calculated on \
that data. No association data from the PRSKB will be used. Additionally, the optional params \
${MYSTERYCOLOR}-t${LIGHTRED}, ${MYSTERYCOLOR}-k${LIGHTRED}, ${MYSTERYCOLOR}-i${LIGHTRED}, ${MYSTERYCOLOR}-e${LIGHTRED}, \
${MYSTERYCOLOR}-y${LIGHTRED}, and ${MYSTERYCOLOR}-g${LIGHTRED} will be ignored.${NC}"
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
        echo -e "| ${LIGHTPURPLE}2${NC} - Super Population         |"
        echo -e "| ${LIGHTPURPLE}3${NC} - RsID                     |"
        echo -e "| ${LIGHTPURPLE}4${NC} - Chromosome               |"
        echo -e "| ${LIGHTPURPLE}5${NC} - Position                 |"
        echo -e "| ${LIGHTPURPLE}6${NC} - Risk Allele              |"
        echo -e "| ${LIGHTPURPLE}7${NC} - Odds Ratio               |"
        echo -e "| ${LIGHTPURPLE}8${NC} - Beta Coefficient         |"
        echo -e "| ${LIGHTPURPLE}9${NC} - Beta Unit                |"
        echo -e "| ${LIGHTPURPLE}10${NC} - P-value                 |"
        echo    "|                              |"
        echo -e "|${LIGHTPURPLE}OPTIONAL COLUMNS: ${NC}            |"
        echo -e "| ${LIGHTPURPLE}11${NC} - Citation                |"
        echo -e "| ${LIGHTPURPLE}12${NC} - Reported Trait          |"
        echo -e "| ${LIGHTPURPLE}13${NC} - P-Value Annotation      |"
        echo -e "| ${LIGHTPURPLE}14${NC} - Beta Annotation         |"
        echo -e "|                              |"
        echo -e "| ${LIGHTPURPLE}15${NC} - Return To Main Menu     |"
        echo    "|_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ |"

        read -p "#? " option
        echo ""

        case $option in 
            1 ) echo -e "${MYSTERYCOLOR} Study ID: ${NC}" 
                echo "A unique study identifier. In our database, we use GWAS Catalog study identifiers. As long as this is unique for each study, it can be whatever you want."
                echo "" ;;
            2 ) echo -e "${MYSTERYCOLOR} Trait: ${NC}" 
                echo "The Experimental Factor Ontology (EFO) trait the GWAS deals with."
                echo "" ;;
            3 ) echo -e "${MYSTERYCOLOR} Super Population: ${NC}" 
                echo "The super population from the 1000 Genomes most closely associated with the GWAS data. This super population will be used for LD calculations."
                echo "" ;;
            3 ) echo -e "${MYSTERYCOLOR} RsID: ${NC}"
                echo "The Reference SNP cluster ID (RsID) of the SNP."
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
            8 ) echo -e "${MYSTERYCOLOR} Beta Coefficient: ${NC}"
                echo "Computed in the GWAS study, a numerical value that indicates the increase or decrease in the genetic risk per unit. "
                echo "" ;;
            9 ) echo -e "${MYSTERYCOLOR} Beta Unit: ${NC}"
                echo "The units associated with the beta coefficient. e.g. cm, beats per min "
                echo "" ;;
            10 ) echo -e "${MYSTERYCOLOR} P-value: ${NC}"
                echo "The probability that the risk allele confers the amount of risk stated."
                echo "" ;;
            11 ) echo -e "${MYSTERYCOLOR} Citation: ${NC}"
                echo "The citation information for the study."
                echo "" ;;
            12 ) echo -e "${MYSTERYCOLOR} Reported Trait: ${NC}"
                echo "Trait description for this study in the authors own words."
                echo "" ;;
            13 ) echo -e "${MYSTERYCOLOR} P-Value Annotation: ${NC}"
                echo "Provides additional information for the p-value, i.e. if the p-value computed only included women"
                echo "" ;;
            14 ) echo -e "${MYSTERYCOLOR} Beta Annotation: ${NC}"
                echo "Provides additional information for the beta value"
                echo "" ;;
            15 ) cont=0 ;;
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
    valueTypesForCalc=()
    sexForCalc=()
    isCondensedFormat=1
    omitPercentiles=0
    isIndividualClump=0

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

    while getopts 'f:o:c:r:p:t:k:i:e:vs:g:n:u:a:by:q:mx:l' c "$@"
    do 
        case $c in 
            f)  if ! [ -z "$filename" ]; then
                    echo "Too many filenames given at once."
                    echo "If you have files split into multiple chromosomes, use Bash expansion"
                    echo "to select them all. Be sure to put the path in either single (') or double(\")"
                    echo "quotes. If the chromosome files are compressed, they must all be compressed in the same way."
                    echo "Additionally, directories and files should not contain spaces in the names."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                filename=$OPTARG
                filename="${filename//\\//}" # replace backslashes with forward slashes
                files=( $(echo $filename) )
                if [ ! -f "${files[0]}" ]; then
                    echo -e "The file${LIGHTRED} ${files[0]} ${NC}does not exist."
                    echo "Check the path and try again."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                elif ! [[ $(echo ${files[0]} | tr '[:upper:]' '[:lower:]') =~ .vcf$|.txt$ ]]; then
                    # check if the file is a valid zipped file (check getZippedFileExtension for more details)
                    zipExtension=`$pyVer "$SCRIPT_DIR/grep_file.py" "zip" "${files[0]}" "True" "False"`
                    if [ "$zipExtension" = ".vcf" ] || [ "$zipExtension" = ".txt" ]; then
                        echo "zipped file validated"
                    # if "False", the file is not a zipped file
                    elif [ "$zipExtension" = "False" ]; then
                        echo -e "The file${LIGHTRED} ${files[0]} ${NC}is in the wrong format."
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
                output=$(echo $OPTARG)
                output_ext=$(echo $OPTARG | tr '[:upper:]' '[:lower:]')
                output="${output//\\//}" # replace backslashes with forward slashes
                if ! [[ "${output_ext}" =~ .tsv$|.json$ ]]; then
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
            v)  isCondensedFormat=0;;
            g)  sex=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
                if [ $sex != 'f' ] && [ $sex != 'm' ] && [ $sex != 'female' ] && [ $sex != 'male' ] && [ $sex != 'e' ] && [ $sex != 'exclude' ]; then
                    echo "Invalid argument for -g. Use a combination of f, m, female, male, or e or exclude "
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                else
                    if [ $sex == 'm' ] || [ $sex == 'male' ]; then
                        sexForCalc+=("male")
                    elif [ $sex == 'f' ] || [ $sex == 'female' ]; then
                        sexForCalc+=("female")
                    else
                        echo "'e' or 'exclude' present. Other sex parameters will be ignored."
                        sexForCalc+=("$sex")
                    fi
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
                useGWAS="True"
                omitPercentiles=1;;
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
            b)  userGwasBeta=1 ;;
            y)  valueType=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
                if [ $valueType != 'beta' ] && [ $valueType != 'odds' ] && [ $valueType != 'beta values' ] && [ $valueType != 'odds ratios' ] ; then
                    echo "Invalid argument for -y. Use 'beta' or 'beta values' and/or 'odds' or 'odds ratios'"
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                else
                    if [ $valueType != 'beta' ] || [ $valueType != 'beta values' ] ; then
                        valueTypesForCalc+=("beta")
                    else
                        valueTypesForCalc+=("odds")
                    fi
                fi;;
            q)  if ! [ -z "$mafCohort" ]; then
                    echo "Too many minor allele frequency cohorts given."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                mafCohort=$(echo "$OPTARG" | tr '[:upper:]' '[:lower:]')
                if ! [[ "$mafCohort" =~ ^adni-ad$|^adni-mci$|^adni-cn$|^ukbb$|^afr$|^amr$|^eas$|^eur$|^sas$|^user$ ]]; then
                    echo -e "${LIGHTRED}$mafCohort ${NC}should be adni-ad, adni-mci, adni-cn, ukbb, afr, amr, eas, eur, sas, or user"
                    echo "The default when this parameter is not present is ukbb."
                    echo "Check the value and try again."
                    exit 1
                fi;;
            m)  omitPercentiles=1;;
            c)  if ! [ -z "$mafCutoff" ]; then
                    echo "Too many maf cutoffs given"
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi
                mafCutoff=$OPTARG
                if ! [[ "$mafCutoff" =~ ^[0-9]*(\.[0-9]+)?$ ]]; then
                    echo -e "${LIGHTRED}$mafCutoff ${NC}is your maf cutoff value, but it is not a number."
                    echo "Check the value and try again."
                    echo -e "${LIGHTRED}Quitting...${NC}"
                    exit 1
                fi;;
            l)  isIndividualClump=1;;
            [?])    usage
                    exit 1;;
        esac
    done

    # if the user is using a txt file and forgot to set the refgen, we are going to default it to hg38
    if [[ $(echo $filename | tr '[:upper:]' '[:lower:]') =~ .txt$ ]] && [ -z "$refgen" ] ; then
        echo "No refGen selected, defaulting to hg38"
        refgen='hg38'
    elif ! [ -z "$zipExtension" ] && [ "$zipExtension" = ".txt" ] && [ -z "$refgen" ] ; then
        echo "No refGen selected, defaulting to hg38"
        refgen='hg38'
    fi

    # if missing a required parameter, show menu/usage option
    if [ -z "$files" ] || [ -z "$output" ] || [ -z "$cutoff" ] || [ -z "$refgen" ] || [ -z "$superPop" ]; then
        askToStartMenu
    fi

    # if no step specified, set step to 0 and do both steps
    if [ -z "$step" ]; then
        step=0
    fi
    # if no GWAS refgen is specified but a path to a gwas file is give, set GWASrefgen to the samples refgen
    if [ -z "${GWASrefgen}" ] && ! [ -z "${GWASfilename}" ]; then
        GWASrefgen=${refgen}
    fi

    # default the mafCohort to UKBB
    if [ -z "${mafCohort}" ]; then
        mafCohort='ukbb'
    fi

    # default the maf cutoff to zero
    if [ -z "${mafCutoff}" ]; then
        mafCutoff=0
    fi

    # preps variables for passing to python script
    export traits=${traitsForCalc[@]}
    export studyTypes=${studyTypesForCalc[@]}
    export studyIDs=${studyIDsForCalc[@]}
    export ethnicities=${ethnicityForCalc[@]}
    export valueTypes=${valueTypesForCalc[@]}
    export sexes=${sexForCalc[@]}
    export files=${files[@]}

    # Creates a hash to put on the associations file if needed or to call the correct associations file
    fileHash=$(cksum <<< "${files}${output}${cutoff}${refgen}${superPop}${traits}${studyTypes}${studyIDs}${ethnicities}${valueTypes}${sexes}${mafCohort}${omitPercentiles}" | cut -f 1 -d ' ')
    if ! [ -z ${GWASfilename} ]; then
        fileHash=$(cksum <<< "${files}${output}${cutoff}${refgen}${superPop}${GWASfilename}${GWASrefgen}${userGwasBeta}${omitPercentiles}" | cut -f 1 -d ' ')
    fi
    requiredParamsHash=$(cksum <<< "${files}${output}${cutoff}${refgen}${superPop}" | cut -f 1 -d ' ')
    # Create uniq ID for filtered file path
    TIMESTAMP=`date "+%Y-%m-%d_%H-%M-%S-%3N"` 
    
    # if zipExtension hasn't been instantiated yet, initialize it
    if [ -z "$zipExtension" ]; then
        zipExtension="NULL"
    fi
    # if the zip extension is valid, set extension to the zip extension, 
    # otherwise use python os.path.splitext to get the extension
    if [ $zipExtension = ".vcf" ] || [ $zipExtension = ".txt" ]; then
        extension="$zipExtension"
    else
        extension=$($pyVer -c "import os; f_name, f_ext = os.path.splitext('${files[0]}'); print(f_ext);")
    fi

    # if GWAS file is present and GWASzipExtension hasn't been instantiated yet, initialize it
    if ! [ -z "${GWASfilename}" ]; then
        if [ -z "$GWASzipExtension" ]; then
            GWASzipExtension="NULL"
        fi
        # if the zip extension is valid, set extension to the zip extension, 
        # otherwise use python os.path.splitext to get the extension
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
            if ! [ -z ${GWASfilename} ]; then
                echo -e "${LIGHTBLUE}Checking for required packages used for GWAS upload data strand flipping${NC}"
                echo "Checking for myvariant package requirement"
                {
                    $pyVer -c "import myvariant" >/dev/null 2>&1
                } && {
                    echo -e "myvariant package requirement met\n"
                } || {
                    {
                        echo "Missing package requirement: myvariant"
                        echo "Attempting download"
                    } && {
                        $pyVer -m pip install myvariant
                    } && {
                        echo -e "Download successful, Package requirement met\n"
                    } || {
                        echo "Failed to download the required package."
                        echo "Please manually download this package (myvariant) and try running the tool again."
                        exit 1
                    }
                }

                echo "Checking for biopython package requirement"
                {
                    $pyVer -c "import Bio" >/dev/null 2>&1
                } && {
                    echo -e "biopython package requirement met\n"
                } || {
                    {
                        echo "Missing package requirement: biopython"
                        echo "Attempting download"
                    } && {
                        $pyVer -m pip install biopython
                    } && {
                        echo -e "Download successful, Package requirement met\n"
                    } || {
                        echo "Failed to download the required package."
                        echo "Please manually download this package (biopython) and try running the tool again."
                        exit 1
                    }
                }

                echo "Checking for biothings_client package requirement"
                {
                    $pyVer -c "import biothings_client" >/dev/null 2>&1
                } && {
                    {
                        echo -e "updating biothings_client to the latest version\n"
                        $pyVer -m pip install biothings_client -U
                    } && {
                        echo -e "biothings_client package requirement met\n"
                    } || {
                        echo "Failed to update the required package."
                        echo "If this causes the tool to fail, please update the biothings_client package manually and try running the tool again"
                    }
                } || {
                    {
                        echo "Missing package requirement: biothings_client"
                        echo "Attempting download"
                    } && {
                        $pyVer -m pip install biothings_client -U
                    } && {
                        echo -e "Download successful, Package requirement met\n"
                    } || {
                        echo "Failed to download the required package."
                        echo "Please manually download this package (biothings_client) and try running the tool again."
                        exit 1
                    }
                }
            fi
            echo "All package requirements met"
        fi

        checkForNewVersion
        echo "Running PRSKB on ${files[@]}"

        if ! [ -z "${GWASfilename}" ]; then 
            # Calls a python function to format the given GWAS data and get the clumps from our database
            # saves both to files
            # GWAS data --> GWASassociations_{fileHash}.txt
            # clumps --> {superPop}_clumps_{refGen}_{fileHash}.txt
            if $pyVer "${SCRIPT_DIR}/connect_to_server.py" "GWAS" "${GWASfilename}" "${userGwasBeta}" "${GWASextension}" "${GWASrefgen}" "${refgen}" "${superPop}" "${mafCohort}" "${fileHash}" "${extension}"; then
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
            if $pyVer "${SCRIPT_DIR}/connect_to_server.py" "$refgen" "${traits}" "${studyTypes}" "${studyIDs}" "${ethnicities}" "${valueTypes}" "${sexes}" "$superPop" "$fileHash" "$extension" "${mafCohort}" "${omitPercentiles}"; then
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

        echo "Calculating prs on ${files[@]}"
        FILE="${SCRIPT_DIR}/.workingFiles/associations_${fileHash}.txt"
        if ! [ -z "${GWASfilename}" ]; then 
            FILE="${SCRIPT_DIR}/.workingFiles/GWASassociations_${fileHash}.txt"
        fi

        # filter the input file so that it only includes the lines with variants that match the given filters
        if $pyVer "${SCRIPT_DIR}/grep_file.py" "$files" "$fileHash" "$requiredParamsHash" "$superPop" "$refgen" "${sexes}" "${valueTypes}" "$cutoff" "${traits}" "${studyTypes}" "${studyIDs}" "$ethnicities" "$extension" "$TIMESTAMP" "$useGWAS"; then
            echo "Filtered input file"
            # parse through the filtered input file and calculate scores for each given study
            if $pyVer "${SCRIPT_DIR}/parse_associations.py" "$files" "$fileHash" "$requiredParamsHash" "$superPop" "${mafCohort}" "$refgen" "$cutoff" "$mafCutoff" "$extension" "$output" "$outputType" "$isCondensedFormat" "$omitPercentiles" "$TIMESTAMP" "$processes" "$isIndividualClump" "$useGWAS"; then
                echo "Parsed through genotype information"
                echo "Calculated score"
            else
                echo -e "${LIGHTRED}ERROR DURING CALCULATION... Quitting${NC}" 
            fi
        else
            echo -e "${LIGHTRED}ERROR DURING CREATION OF FILTERED INPUT FILE... Quitting${NC}"
        fi

        #TODO and an option for users to remove these files if they want
        # if [[ $fileHash != $requiredParamsHash ]] && [[ -f "$FILE" ]]; then
        #     rm "$FILE"
        #     rm "${SCRIPT_DIR}/.workingFiles/${superPop}_clumps_${refgen}_${fileHash}.txt"
        #     rm "${SCRIPT_DIR}/.workingFiles/traitStudyIDToSnps_${fileHash}.txt"
        #     rm "${SCRIPT_DIR}/.workingFiles/clumpNumDict_${refgen}_${fileHash}.txt" 
        # fi
        
        [ -e "${SCRIPT_DIR}/.workingFiles/filteredInput_${TIMESTAMP}${extension}" ] && rm -- "${SCRIPT_DIR}/.workingFiles/filteredInput_${TIMESTAMP}${extension}"
        [ -d "${SCRIPT_DIR}/__pycache__" ] && rm -r "${SCRIPT_DIR}/__pycache__"
        [ -e "${SCRIPT_DIR}/$output.lock" ] && rm -- "${SCRIPT_DIR}/$output.lock"
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
