#!/bin/bash

# This script calls the other scripts in the folder to:
#   1. download data from the GWAS catalog, 
#   2. put the data in association tables,
#   3. create a study table,
#   4. find new and updated studies and traits, 
#   5. and upload these studies and traits to the PRSKB database. 
# It usually takes 6ish hours to complete on the PRSKB server using 8 downloading nodes. Using the command below, it runs in the background, which means
# you can leave the server and it will keep running! To see the output, go to the "output.txt" file specified in the command below as well as the 
# console_files folder for outputs from the data download nodes (see the unpackDatabaseCommandLine.R script).
#
# How to run: sudo ./master_script.sh "password" "numNodes" &> output.txt &
# where "password" is the password to the PRSKB database
#       "numNodes" is the number of times the GWAS database will be divided for download (higher is better for beefy computers)
#       "outputFile.txt" is the file where terminal output will be stored
# See below for other optional arguments

#===============Argument Handling================================================================
if [ $# -lt 2 ]; then
    echo "Too few arguments! Usage:"
    echo "master_script.sh" 
    echo "  [password]"
    echo "  [number of nodes to download data (default: 1)]"
    echo "  [optional: folder for console output files (default: \"./console_files\")]"
    echo "  [optional: path to association csvs folder (default: \"../tables/association_tables/\")]"
    echo "  [optional: path to study table folder (not same as association csvs folder) (default: \"./\")]"
    read -p "Press [Enter] key to quit..."
# check if $2 is a number
elif ! [[ "$2" =~ ^[0-9]+$ ]]; then
    echo "$2 is the number of nodes you specified to download data, but it is not an integer."
    echo "Check the value and try again."
    read -p "Press [Enter] key to quit..."
# check that if $3 is populated, it is a directory that exists
elif [ ! -z $3 ] && [ ! -d $3 ]; then
    echo "Directory" $3 "does not exist."
    read -p "Press [Enter] key to quit..."
# check that if $4 is populated, it is a directory that exists
elif [ ! -z $4 ] && [ ! -d $4 ]; then
    echo "Directory" $4 "does not exist."
    read -p "Press [Enter] key to quit..."
# check that if $5 is populated, it is a directory that exists
elif [ ! -z $5 ] && [ ! -d $5 ]; then
    echo "Directory " + $5 + " does not exist."
    read -p "Press [Enter] key to quit..."
else
    password=$1
    numGroups=$2
    # if $3, $4, or $5 aren't populated, set them to default values
    consoleOutputFolder=${3:-"./console_files/"}
    associationTablesFolderPath=${4:-"../tables/association_tables/"} 
    studyTableFolderPath=${5:-"../tables/"}

#===============Creating Output Paths========================================================
    # if the default path doesn't exist, create it
    if [ ! -d $consoleOutputFolder ]; then
        mkdir $consoleOutputFolder
        echo "Default console output folder created at" $consoleOutputFolder
    fi

    # if the default path doesn't exist, create it
    if [ ! -d $associationTablesFolderPath ]; then
        mkdir $associationTablesFolderPath
        echo "Default associations table folder created at" $associationTablesFolderPath
    fi

#===============GWAS Database Unpacker======================================================
    echo "Running GWAS database unpacker. This will take many hours depending on the number of nodes you specified to download data."
    for ((groupNum=1;groupNum<=numGroups;groupNum++)); do
        Rscript unpackDatabaseCommandLine.R $associationTablesFolderPath "." $groupNum $numGroups &> "$consoleOutputFolder/output$groupNum.txt" &
    done
    wait
    echo -e "Finished unpacking the GWAS database. The associations tables can be found at" $associationTablesFolderPath "\n"

#===============Study Table Code============================================================
    echo "Creating the study table. This can take an hour or more to complete."
    Rscript createStudyTable.R $outputFilesPath
    wait
    echo -e "Finished creating the study table. It can be found at" $studyTableFolderPath "\n"

#===============Get Updated Studies and Traits===============
    # get updated studies and traits
    echo "Getting the updated studies and traits lists."
    output=`python3 getUpdatedStudiesAndTraitsLists.py "$password" "$studyTableFolderPath"`
    # 1 if there was an error executing getUpdatedStudiesAndTraitsLists.py, 0 if there was no error
    updatedListsReturnCode=$?
    # read the output into an array of lines
    readarray -t arrayOutput <<<"$output"

    # if the getUpdatedStudiesAndTraitsLists exited with errors, print the errors and abort
    if ! [[ $updatedListsReturnCode == 0 ]]; then
        echo "The updated studies and traits could not be determined. Aborting."
        END=${#arrayOutput[@]}
        for ((i=0;i<=END;i++)); do
            echo ${arrayOutput[$i]}
        done
        read -p "Press [Enter] key to finish..."
        exit 1
    fi

    # print all but the last 3 lines, two of which are the updated studies and trait lists and the last is an empty line (not sure why)
    END=${#arrayOutput[@]}-3
    for ((i=0;i<=END;i++)); do
        echo ${arrayOutput[$i]}
    done

    # capture the study and trait lists as strings and remove \r and \n
    updatedStudies=$(echo ${arrayOutput[$i]} | sed -e 's/\r\n//g')
    updatedTraits=$(echo ${arrayOutput[$i+1]} | sed -e 's/\r\n//g')

    # send the updatedStudies to a txt file
    echo $updatedStudies > updatedStudies.txt
    # send the updatedTraits to a txt file
    echo $updatedTraits > updatedTraits.txt
    echo "Printed out updated studies to updatedStudies.txt and updated traits to updatedTraits.txt for LD clumping script."

    # add a space between sections in the output
    echo ""

#===============Upload Tables to PRSKB Database========================================================
    # if updatedStudies is empty or none, dont' upload, otherwise upload new tables
    if [ -z "$updatedStudies" ] || [ "$updatedStudies" == "none" ]; then
        echo -e "No GWAS catalog tables have been updated, so no tables were updated or uploaded to the PRSKB database.\n"
    else
        echo "Uploading tables to the PRSKB database."
        python3 uploadTablesToDatabase.py "$password" $associationTablesFolderPath $studyTableFolderPath "false" "$updatedTraits"
        wait
        echo -e "Finished uploading tables to the PRSKB database.\n"
    fi

#===============Create Sample VCF=====================================================================
    echo "Creating sample vcf"
    python3 createSampleVCF.py
    wait 
    echo "Finished creating sample vcf"
    # need to move the vcf to the correct location...

    read -p "Press [Enter] key to finish..."
fi