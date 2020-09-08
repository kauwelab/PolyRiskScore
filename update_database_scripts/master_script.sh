#!/bin/bash

# command to run:
# sudo ./master_script.sh "password" "numNodes" &> outputFile.txt &
# where "password" is the password to the PRSKB database
#       "numNodes" is the number of times the GWAS database will be divided for download (higher is better for beefy computers)
#       "outputFile.txt" is the file where terminal output will be stored
# Note: this command will take many hours to run, but runs in the background. 
# This means you can leave the server and it will keep running!

#===============Argument Handling================================================================
if [ $# -lt 2 ]; then
    echo "Too few arguments! Usage:"
    echo "master_script.sh" 
    echo "  [password]"
    echo "  [number of nodes to download data (default: 1)]"
    echo "  [optional: folder for console output files (default: \"./console_files\")]"
    echo "  [optional: path to association csvs folder (default: \"./association_tables/\")]"
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
    associationTablesFolderPath=${4:-"./association_tables"} 
    studyTableFolderPath=${5:-"./"}

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
    output=`python getUpdatedStudiesAndTraitsLists.py "$password" "$studyTableFolderPath"`
    updatedListsReturnCode=$?
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

    # print all but the last 3 lines, two of which are the updated studies 
    # and trait lists and the last is an empty line (for the error code)

    END=${#arrayOutput[@]}-3
    for ((i=0;i<=END;i++)); do
        echo ${arrayOutput[$i]}
    done

    # capture the study and trait lists as strings and remove \r and \n
    updatedStudies=$(echo ${arrayOutput[$i]} | sed -e 's/\r\n//g')
    updatedTraits=$(echo ${arrayOutput[$i+1]} | sed -e 's/\r\n//g')

    echo $updatedStudies > updatedStudies.txt
    echo "Printed out updated studies to updatedStudies.txt for LD clumping script."

    # add a space between sections in the output
    echo ""

#===============Upload Tables to PRSKB Database========================================================
    if [ -z "$updatedStudies" ] || [ "$updatedStudies" == "none" ]; then
        echo -e "No GWAS catalog tables have been updated, so no tables were updated or uploaded to the PRSKB database.\n"
    else
        echo "Uploading tables to the PRSKB database."
        python uploadTablesToDatabase.py "$password" $associationTablesFolderPath $studyTableFolderPath "false" "$updatedTraits"
        wait
        echo -e "Finished uploading tables to the PRSKB database.\n"
    fi

    read -p "Press [Enter] key to finish..."
fi