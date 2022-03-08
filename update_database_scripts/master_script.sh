#!/bin/bash

# This script calls the other scripts in the folder to:
#   1. download raw data from the GWAS catalog,
#   2. put the data in an association table,
#   3. sort the associations table,
#   4. create a study table,
#   5. remove raw data dowloaded,
#   6. do strand flipping on the associations table,
#   7. upload the new study and association tables as well as the cohort tables to the PRSKB database,
#   8. create example VCF and rsID files,
#   9. and create association and clumps download files.
# It usually takes 3-5ish hours to complete on the PRSKB server using 8 downloading nodes. Using the command below, it runs in the background, which means
# you can leave the server and it will keep running! To see the output, go to the "output.txt" file specified in the command below as well as the
# console_files folder for outputs from the data download nodes (see the unpackDatabaseCommandLine.R script).
#
# How to run: sudo ./master_script.sh "password" "numNodes" &> output.txt &
# where "password" is the password for the PRSKB database or the path to the password file
#       "numNodes" is the number of times the GWAS database will be divided for download (higher is better for beefy computers)
#       "outputFile.txt" is the file where terminal output will be stored
# See the usage and optUsage functions below for other optional arguments

#===============Usage======================================================
usage () {
    echo ""
    echo "----Usage----"
    echo "master_script.sh"
    echo "  [password or path to passwords file]"
    echo "  [optional: number of nodes to download data (default: 1)]"
    echo "  [optional: folder for console output files (default: \"./console_files\")]"
    echo "  [optional: path to association tsv file folder (default: \"../tables/\")]"
    echo "  [optional: path to study table tsv folder (default: \"../tables/\")]"
    echo "  [optional: path to cohort tables tsv folder (default: \"../tables/\")]"
    echo "  [optional: path to example vcf and txt folders (default: \"../static/\")]"
    echo "  [optional: 'daosrfuec' options for disabling parts of the script (can be anywhere in the arguments)]"
    echo ""
    read -p "Would you like to see option usage? (Yn)" yn
    case $yn in
        [Yy]* ) optUsage;;
        * ) exit;;
    esac
}

# usage statements for different script disabling options (options start with a dash (-))
# note: these options are not robust (ex: if -a is selected, but not -s and an associations table does not already exist,
# the program will crash trying to make a new studies table)
optUsage () {
    echo ""
    echo "----Options usage----"
    echo "  [-d: disables downloading new raw data]"
    echo "  [-a: disables creating new associations table]"
    echo "  [-o: disables ordering associations table]"
    echo "  [-s: disables creating new studies table]"
    echo "  [-r: disables removing downloaded raw data]"
    echo "  [-f: disables strand flipping]"
    echo "  [-u: disables uploading tables to the database]"
    echo "  [-e: disables creating example VCF and TXT files]"
    echo "  [-c: disables creating clump and association downloadable files]"
    echo "  [-m: disables creating maf and percentiles downloadable files]"
    echo "  [-g: disables uploading updated files to GitHub]"
}

#===============Error Handling======================================================
# exit when any command fails
set -e

# keep track of the last executed command
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
# run a function before exiting that has two parameters: the error code of the last command run, 
# and the last command run in string form
trap 'trapExit $? "${last_command}"' EXIT

# the function to be run when the program quits
trapExit () {
    unstash
    # if the error code isn't 0, print the command that errored and its error code
    if [ "$1" != "0" ]; then
        echo "\"$2\": exit code:$1"
    fi
}

# if something was stashed in this run of the program, unstash it
unstash () {
    if [[ $stashed == "true" ]]; then
        stashed="false"
        echo "reaplying and popping last stash"
        git stash pop
    fi
}

#===============Python Version======================================================
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
fi

#===============Start Timer======================================================
# get start seconds
start=$(date +%s)
# print date, including day, year, and time
echo "Start time: $(date)"

#===============Argument Handling======================================================
# all options default to true
downloadRawData="true"
associationsTable="true"
orderAssociations="true"
studiesTable="true"
removeRawData="true"
strandFlipping="true"
uploadTables="true"
exampleFiles="true"
clumpAssociationDownloadFiles="true"
mafPercentilesDownloadFiles="true"
github="true"

# non-option argument position counter
i=1
for arg do
    # if the argument starts with dash, parse it as an option
    if [[ $arg == -* ]]; then
        # option handling
        case $arg in
            -d) downloadRawData="false"
                echo "Downloading new raw data disabled";;
            -a) associationsTable="false"
                echo "Creating new associations table disabled";;
            -o) orderAssociations="false"
                echo "Ordering associations table disabled";;
            -s) studiesTable="false"
                echo "Creating new studies table disabled";;
            -r) removeRawData="false"
                echo "Removing downloaded raw data disabled";;
            -f) strandFlipping="false"
                echo "Strand flipping disabled";;
            -u) uploadTables="false"
                echo "Upload tables to database disabled";;
            -e) exampleFiles="false"
                echo "Creating example VCF and TXT files disabled";;
            -c) clumpAssociationDownloadFiles="false"
                echo "Creating clump and association downloadable files disabled";;
            -m) mafPercentilesDownloadFiles="false"
                echo "Creating maf and percentiles downloadable files disabled";;
            -g) github="false"
                echo "Uploading new data to GitHub disabled";;
            *)  echo ""
                echo "Error: option '$arg' not recognized. Valid options are daosrfuecg. Please check your options and try again."
                optUsage
                read -p "Press [Enter] key to quit..."
                exit 1;;
        esac
    # otherwise parse the argument as a non-option argument based on its position in relation to other
    # non-option arguments
    else
        if [ $i -eq 1 ]; then
            passwordPath=$arg
            # if the password path is invalid, this must be a regular password
            pathExists=$($pyVer -c "from os import path; print(path.exists('$passwordPath'));")
            if [[ $pathExists == "False" ]]; then
                echo "using regular password system"
                password=$passwordPath
            else
                echo "getting password from file path specified"
                password=$($pyVer -c "import passwordGetter as p; password = p.getPassword('$passwordPath', 'getMySQLPassword'); print(password);")
                invalidPass=$($pyVer -c "import passwordGetter as p; print('$password' == p.INVALID_NUM_ARGS or '$password' == p.INVALID_PASS or '$password' == p.INVALID_PATH);")
                if [[ $invalidPass == "True" ]]; then
                    echo -e "Error with password file: \"$password\" Exiting...\n"
                    exit 1
                fi
            fi
        elif [ $i -eq 2 ]; then
            if ! [[ "$arg" =~ ^[0-9]+$ ]]; then
                echo "'$arg' is the number of nodes you specified to download data, but it is not an integer."
                echo "Check the value and try again."
                read -p "Press [Enter] key to quit..."
                exit 1
            else
                numGroups=$arg
            fi
        elif [ $i -eq 3 ]; then
            consoleOutputFolder=$arg
        elif [ $i -eq 4 ]; then
            associationTableFolderPath=$arg
        elif [ $i -eq 5 ]; then
            studyTableFolderPath=$arg
        elif [ $i -eq 6 ]; then
            cohortTablesFolderPath=$arg
        elif [ $i -eq 7 ]; then
            sampleVCFFolderPath=$arg
        fi
        # increment the non-option argument position
        i=$((i+1))
    fi
done

# if there are not enough non-option arguments
if [ $i -eq 1 ]; then
    echo ""
    echo "Too few arguments!"
    usage
    read -p "Press [Enter] key to quit..."
    exit 1
fi

# if the folder locations aren't populated, set them to default values
consoleOutputFolder=${consoleOutputFolder:-"./console_files/"}
associationTableFolderPath=${associationTableFolderPath:-"../tables/"}
studyTableFolderPath=${studyTableFolderPath:-"../tables/"}
cohortTablesFolderPath=${cohortTablesFolderPath:-"../tables/cohorts/"}
sampleVCFFolderPath=${sampleVCFFolderPath:-"../static/"}
studyAndPubTSVFolderPath="."
chainFileFolderPath="."

#===============Creating Output Paths========================================================
# if the console output folder path doesn't exist, create it
if [ ! -d $consoleOutputFolder ]; then
    mkdir $consoleOutputFolder
    echo "Console output folder created at" $consoleOutputFolder
fi

# if the association table folder path doesn't exist, create it
if [ ! -d $associationTableFolderPath ]; then
    mkdir $associationTableFolderPath
    echo "Associations table folder created at" $associationTableFolderPath
fi

# if the study table folder path doesn't exist, create it
if [ ! -d $studyTableFolderPath ]; then
    mkdir $studyTableFolderPath
    echo "Study table folder created at" $studyTableFolderPath
fi

# if the sample VCF folder path doesn't exist, create it
if [ ! -d $sampleVCFFolderPath ]; then
    mkdir $sampleVCFFolderPath
    echo "Sample VCF folder created at" $sampleVCFFolderPath
fi

#===============Stash Current Server Changes======================================================
if [ $github == "true" ]; then
    # make stash message based on time
    message=$(printf  $(date '+%H:%M:%S,%m-%d-%Y'))
    # stash the current changes with the message
    git stash save $message
    stashed="true"
fi

#===============GWAS Database Unpacker======================================================
# download a portion of the study data from the GWAS catalog and put it into tsv files
# this makes it so each instance of the "unpackDatabaseCommandLine.R" doesn't need to download its own data
if [ $downloadRawData == "true" ]; then
    Rscript downloadStudiesToFile.R $studyAndPubTSVFolderPath
fi

if [ $associationsTable == "true" ]; then
    echo "Running GWAS database unpacker. This will take up to 1.5 hrs depending on the number of nodes you specified to download data."
    for ((groupNum=1;groupNum<=numGroups;groupNum++)); do
        Rscript unpackDatabaseCommandLine.R $associationTableFolderPath $studyAndPubTSVFolderPath $chainFileFolderPath $groupNum $numGroups &> "$consoleOutputFolder/output$groupNum.txt" &
    done
    wait
    echo -e "Finished unpacking the GWAS database. The associations table can be found at" $associationTableFolderPath "\n"
fi

if [ $orderAssociations == "true" ]; then
    Rscript sortAssociationsTable.R $associationTableFolderPath
    wait
fi

#===============Study Table Code============================================================
if [ $studiesTable == "true" ]; then
    echo "Creating the study table. This should take up to 15 min, but is often faster."
    Rscript createStudyTable.R $associationTableFolderPath $studyTableFolderPath $studyAndPubTSVFolderPath
    wait
fi

if [ $removeRawData == "true" ]; then
    # delete the raw study data files after the study table has been created
    rm "./rawGWASStudyData.tsv"
    rm "./rawGWASPublications.tsv"
    rm "./rawGWASAncestries.tsv"
    rm "./lastUpdated.tsv"
fi

#==============Perform Strand Flipping=================================================================
if [ $strandFlipping == "true" ]; then
    echo "Performing strand flipping on the associations"
    python3 strandFlipping.py $associationTableFolderPath 'w'
    wait
fi

#===============Upload Tables to PRSKB Database========================================================
if [ $uploadTables == "true" ]; then
    echo "Uploading tables to the PRSKB database."
    python3 uploadTablesToDatabase.py "$password" $associationTableFolderPath $studyTableFolderPath
    wait
    python3 uploadCohortDataToDatabase.py "$password" $cohortTablesFolderPath
    wait
fi

#===============Create Sample VCF/TXT=====================================================================
if [ $exampleFiles == "true" ]; then
    echo "Creating sample vcf"
    python3 createSampleVCF.py "sample" $sampleVCFFolderPath
    wait
    python3 create_rsID_file_from_vcf.py "sample" $sampleVCFFolderPath
    wait
fi

#============Create Association and Clumps download files============================================
if [ $clumpAssociationDownloadFiles == "true" ]; then
    echo "Creating Association and Clumps download files"
    python3 createServerAssociClumpsAndTraitStudyToSnpFiles.py "$password"
    wait
fi

#============Create MAF and Percentiles download files============================================
if [ $mafPercentilesDownloadFiles == "true" ]; then
    echo "Creating Association and Clumps download files"
    python3 createServerMafAndPercentileFiles.py "$password"
    wait
fi

#============Upload Tables to Github============================================
if [ $github == "true" ]; then
    operatingSystem=$(printf  $(uname -s))
    if [ $operatingSystem == "Linux" ]; then
        # git pull before git pushing
        echo "starting git pull"
        git pull origin master
        echo "git pull finished"

        date=$(printf  $(date '+%m-%d-%Y'))
        message="database update: ${date}"
        git commit -a -m "$message"
        # get the GitHub username and password for the project using the passwordGetter.py file
        gitUsername=$($pyVer -c "import passwordGetter as p; username = p.getPassword('$passwordPath', 'getGitUsername'); print(username);")
        gitPassword=$($pyVer -c "import passwordGetter as p; password = p.getPassword('$passwordPath', 'getGitPassword'); print(password);")
        echo "starting git push"
        ./gitPush.sh $gitUsername $gitPassword
        echo "Synchronized with GitHub"
    else
        # TODO find way to git push on Windows
        echo "Skipping GitHub synchronization because not running on Linux"
    fi
fi

end=$(date +%s)
# gets the difference between start and end seeconds
diff=$(( ($end - $start) / 1 ))
# gets the time in hms format
diffTime=$(printf '%02dh:%dm:%ds\n' $((diff/3600)) $((diff%3600/60)) $((diff%60)))
echo "Total time taken: $diffTime"

unstash
read -p "Press [Enter] key to finish..."
