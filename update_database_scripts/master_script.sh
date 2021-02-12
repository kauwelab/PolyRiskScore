#!/bin/bash

# This script calls the other scripts in the folder to:
#   1. download data from the GWAS catalog, 
#   2. put the data in an association table,
#   3. create a study table,
#   4. upload the new study and association tables to the PRSKB database, 
#   5. and create association and clumps download files. 
# It usually takes 4ish hours to complete on the PRSKB server using 8 downloading nodes. Using the command below, it runs in the background, which means
# you can leave the server and it will keep running! To see the output, go to the "output.txt" file specified in the command below as well as the 
# console_files folder for outputs from the data download nodes (see the unpackDatabaseCommandLine.R script).
#
# How to run: sudo ./master_script.sh "password" "numNodes" &> output.txt &
# where "password" is the password to the PRSKB database
#       "numNodes" is the number of times the GWAS database will be divided for download (higher is better for beefy computers)
#       "outputFile.txt" is the file where terminal output will be stored
# See below for other optional arguments

#===============Argument Handling================================================================
if [ $# -lt 1 ]; then
    echo "Too few arguments! Usage:"
    echo "master_script.sh" 
    echo "  [password]"
    echo "  [optional: number of nodes to download data (default: 1)]"
    echo "  [optional: folder for console output files (default: \"./console_files\")]"
    echo "  [optional: path to association tsv file folder (default: \"../tables/\")]"
    echo "  [optional: path to study table tsv folder (default: \"../tables/\")]"
    echo "  [optional: path to sample vcf  folder (default: \"../static/\")]"
    read -p "Press [Enter] key to quit..."
# check if $2, or numNodes, is populated, that it is a number
elif [ ! -z $2 ] && ! [[ "$2" =~ ^[0-9]+$ ]]; then
    echo "'$2' is the number of nodes you specified to download data, but it is not an integer."
    echo "Check the value and try again."
    read -p "Press [Enter] key to quit..."
# check that if $3, the consoleOutputFolder, is populated, it is a directory that exists
elif [ ! -z $3 ] && [ ! -d $3 ]; then
    echo "Directory" \'$3\' "does not exist."
    read -p "Press [Enter] key to quit..."
# check that if $4, the associationTableFolderPath, is populated, it is a directory that exists
elif [ ! -z $4 ] && [ ! -d $4 ]; then
    echo "Directory" \'$4\' "does not exist."
    read -p "Press [Enter] key to quit..."
# check that if $5, the studyTableFolderPath, is populated, it is a directory that exists
elif [ ! -z $5 ] && [ ! -d $5 ]; then
    echo "Directory" \'$5\' "does not exist."
    read -p "Press [Enter] key to quit..."
# check that if $6, the sampleVCFFolderPath, is populated, it is a directory that exists
elif [ ! -z $6 ] && [ ! -d $6 ]; then
    echo "Directory" \'$6\' "does not exist."
    read -p "Press [Enter] key to quit..."
else
    password=$1
    numGroups=$2
    # if $3, $4, or $5 aren't populated, set them to default values
    consoleOutputFolder=${3:-"./console_files/"}
    associationTableFolderPath=${4:-"../tables/"} 
    studyTableFolderPath=${5:-"../tables/"}
    sampleVCFFolderPath=${6:-"../static/"}
    studyAndPubTSVFolderPath="."
    chainFileFolderPath="."

#===============Creating Output Paths========================================================
    # if the default console output folder path doesn't exist, create it
    if [ ! -d $consoleOutputFolder ]; then
        mkdir $consoleOutputFolder
        echo "Default console output folder created at" $consoleOutputFolder
    fi

    # if the default association table folder path doesn't exist, create it
    if [ ! -d $associationTableFolderPath ]; then
        mkdir $associationTableFolderPath
        echo "Default associations table folder created at" $associationTableFolderPath
    fi

    # if the default study table folder path doesn't exist, create it
    if [ ! -d $studyTableFolderPath ]; then
        mkdir $studyTableFolderPath
        echo "Default associations table folder created at" $studyTableFolderPath
    fi

#===============GWAS Database Unpacker======================================================
    # download a portion of the study data from the GWAS catalog and put it into tsv files
    # this makes it so each instance of the "unpackDatabaseCommandLine.R" doesn't need to download its own data
    Rscript downloadStudiesToFile.R $studyAndPubTSVFolderPath

    echo "Running GWAS database unpacker. This will take many hours depending on the number of nodes you specified to download data."
    for ((groupNum=1;groupNum<=numGroups;groupNum++)); do
        Rscript unpackDatabaseCommandLine.R $associationTableFolderPath $studyAndPubTSVFolderPath $chainFileFolderPath $groupNum $numGroups &> "$consoleOutputFolder/output$groupNum.txt" &
    done
    wait
    echo -e "Finished unpacking the GWAS database. The associations table can be found at" $associationTableFolderPath "\n"
    Rscript sortAssociationsTable.R $associationTableFolderPath
    wait

#===============Study Table Code============================================================
    echo "Creating the study table. This can take an hour or more to complete."
    Rscript createStudyTable.R $associationTableFolderPath $studyTableFolderPath $studyAndPubTSVFolderPath
    wait
    echo -e "Finished creating the study table. It can be found at" $studyTableFolderPath "\n"
    # delete the raw study data files after the study table has been created
    rm "./rawGWASStudyData.tsv"
    rm "./rawGWASPublications.tsv"
    rm "./rawGWASAncestries.tsv"

#==============Perform Strand Flipping=================================================================

    echo "Performing strand flipping on the associations"
    python3 strandFlipping.py 
    wait 
    echo "Finished the strand flipping"

#===============Upload Tables to PRSKB Database========================================================
    # if updatedStudies is empty or none, dont' upload, otherwise upload new tables
    echo "Uploading tables to the PRSKB database."
    python3 uploadTablesToDatabase.py "$password" $associationTableFolderPath $studyTableFolderPath
    wait
    echo -e "Finished uploading tables to the PRSKB database.\n"

#===============Create Sample VCF/TXT=====================================================================
    echo "Creating sample vcf"
    python3 createSampleVCF.py "sample" $sampleVCFFolderPath
    wait 
    python3 create_rsID_file_from_vcf.py "sample" $sampleVCFFolderPath
    wait
    echo "Finished creating sample vcf"

#============Create Association and Clumps download files ============================================
    echo "Creating Association and Clumps download files"
    python3 createServerAssociAndClumpsFiles.py $password
    wait
    echo "Finished creating server download association and clumps files"

    read -p "Press [Enter] key to finish..."
fi
