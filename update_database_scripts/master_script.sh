#!/bin/bash

# This script calls the other scripts in the folder to:
#   1. download raw data from the GWAS catalog,
#   2. put the data in an association table,
#   3. sort the associations table,
#   4. create a study table,
#   5. remove raw data dowloaded,
#   6. do strand flipping on the associations table,
#   7. upload the new study and association tables as well as the ukbb tables to the PRSKB database,
#   8. create example VCF and rsID files,
#   9. and create association and clumps download files. 
# It usually takes 4ish hours to complete (TODO: update this estimate) on the PRSKB server using 8 downloading nodes. Using the command below, it runs in the background, which means
# you can leave the server and it will keep running! To see the output, go to the "output.txt" file specified in the command below as well as the 
# console_files folder for outputs from the data download nodes (see the unpackDatabaseCommandLine.R script).
#
# How to run: sudo ./master_script.sh "password" "numNodes" &> output.txt &
# where "password" is the password to the PRSKB database
#       "numNodes" is the number of times the GWAS database will be divided for download (higher is better for beefy computers)
#       "outputFile.txt" is the file where terminal output will be stored
# See the usage and optUsage functions below for other optional arguments

#===============Usage======================================================
usage () { 
    echo ""
    echo "----Usage----"
    echo "master_script.sh" 
    echo "  [password]"
    echo "  [optional: number of nodes to download data (default: 1)]"
    echo "  [optional: folder for console output files (default: \"./console_files\")]"
    echo "  [optional: path to association tsv file folder (default: \"../tables/\")]"
    echo "  [optional: path to study table tsv folder (default: \"../tables/\")]"
    echo "  [optional: path to ukbb tables tsv folder (default: \"../tables/\")]"
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
    echo "  [-o: disables ording associations table]"
    echo "  [-s: disables creating new studies table]"
    echo "  [-r: disables removing downloaded raw data]"
    echo "  [-f: disables strand flipping]"
    echo "  [-u: disables uploading tables to the database]"
    echo "  [-e: disables creating example VCF and TXT files]"
    echo "  [-c: disables creating clump and association downloadable files]"
}

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

    # non-option argument position counter
    i=1
    for arg do
        # if the argument starts with dash, parse it as an option
        if [[ $arg == -* ]]; then
            # option handling
            case $arg in 
                -d)  downloadRawData="false"
                    echo "Downloading new raw data disabled";;
                -a)  associationsTable="false"
                    echo "Creating new associations table disabled";;
                -o)  orderAssociations="false"
                    echo "Ordering associations table disabled";;
                -s)  studiesTable="false"
                    echo "Creating new studies table disabled";;
                -r)  removeRawData="false"
                    echo "Removing downloaded raw data disabled";;
                -f)  strandFlipping="false"
                    echo "Strand flipping disabled";;
                -u)  uploadTables="false"
                    echo "Upload tables to database disabled";;
                -e)  exampleFiles="false"
                    echo "Creating example VCF and TXT files disabled";;
                -c)  clumpAssociationDownloadFiles="false"
                    echo "Creating clump and association downloadable files disabled";;
                *)  echo ""
                    echo "Error: option '$arg' not recognized. Valid options are daosrfuec. Please check your options and try again."
                    optUsage
                    read -p "Press [Enter] key to quit..."
                    exit 1;;
            esac
        # otherwise parse the argument as a non-option argument based on its position in relation to other
        # non-option arguments
        else
            if [ $i -eq 1 ]; then
                password=$arg
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
                ukbbTablesFolderPath=$arg
            elif [ $i -eq 7 ]; then
                sampleVCFFolderPath=$arg
            fi
            # increment the non-option argument position
            i=$((i+1))
        fi
    done

    # if there were to many or not enough non-option arguments
    if [ $i -eq 1 ]; then
        echo ""
        echo "Too few arguments!"
        usage
        read -p "Press [Enter] key to quit..."
        exit 1
    elif [ $i -ge 8 ]; then
        echo ""
        echo "Too many arguments!"
        usage
        read -p "Press [Enter] key to quit..."
        exit 1
    fi

    # if the folder locations aren't populated, set them to default values
    consoleOutputFolder=${consoleOutputFolder:-"./console_files/"}
    associationTableFolderPath=${associationTableFolderPath:-"../tables/"} 
    studyTableFolderPath=${studyTableFolderPath:-"../tables/"}
    ukbbTablesFolderPath=${ukbbTablesFolderPath:-"../tables/"}
    sampleVCFFolderPath=${sampleVCFFolderPath:-"../static/"}
    studyAndPubTSVFolderPath="."
    chainFileFolderPath="."

    #TODO remove
    echo "password: $password"
    echo "numGroups: $numGroups"
    echo "consoleOutputFolder: $consoleOutputFolder"
    echo "associationTableFolderPath: $associationTableFolderPath"
    echo "studyTableFolderPath: $studyTableFolderPath"
    echo "sampleVCFFolderPath: $sampleVCFFolderPath"
    echo "studyAndPubTSVFolderPath: $studyAndPubTSVFolderPath"
    echo "chainFileFolderPath: $chainFileFolderPath"
    
    #TODO remove
    echo "downloadRawData: $downloadRawData"
    echo "associationsTable: $associationsTable"
    echo "orderAssociations: $orderAssociations"
    echo "studiesTable: $studiesTable"
    echo "removeRawData: $removeRawData"
    echo "strandFlipping: $strandFlipping"
    echo "uploadTables: $uploadTables"
    echo "exampleFiles: $exampleFiles"
    echo "clumpAssociationDownloadFiles: $clumpAssociationDownloadFiles"

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

#===============GWAS Database Unpacker======================================================
    # download a portion of the study data from the GWAS catalog and put it into tsv files
    # this makes it so each instance of the "unpackDatabaseCommandLine.R" doesn't need to download its own data
    if [ $downloadRawData == "true" ]; then
        Rscript downloadStudiesToFile.R $studyAndPubTSVFolderPath
    fi
    
    if [ $associationsTable == "true" ]; then
        echo "Running GWAS database unpacker. This will take many hours depending on the number of nodes you specified to download data."
        for ((groupNum=1;groupNum<=numGroups;groupNum++)); do
            Rscript unpackDatabaseCommandLine.R $associationTableFolderPath $studyAndPubTSVFolderPath $chainFileFolderPath $groupNum $numGroups &> "$consoleOutputFolder/output$groupNum.txt" &
        done
        wait
        echo -e "Finished unpacking the GWAS database. The associations table can be found at" $associationTableFolderPath "\n"
    fi
    exit 1

    if [ $orderAssociations == "true" ]; then
        Rscript sortAssociationsTable.R $associationTableFolderPath
        wait
    fi

#===============Study Table Code============================================================
    if [ $studiesTable == "true" ]; then
        echo "Creating the study table. This can take an hour or more to complete."
        Rscript createStudyTable.R $associationTableFolderPath $studyTableFolderPath $studyAndPubTSVFolderPath
        wait
    fi
    
    if [ $removeRawData == "true" ]; then
        # delete the raw study data files after the study table has been created
        rm "./rawGWASStudyData.tsv"
        rm "./rawGWASPublications.tsv"
        rm "./rawGWASAncestries.tsv"
    fi

#==============Perform Strand Flipping=================================================================
    if [ $strandFlipping == "true" ]; then
        echo "Performing strand flipping on the associations"
        python3 strandFlipping.py $associationTableFolderPath
        wait
    fi

#===============Upload Tables to PRSKB Database========================================================
    if [ $uploadTables == "true" ]; then
        echo "Uploading tables to the PRSKB database."
        python3 uploadTablesToDatabase.py "$password" $associationTableFolderPath $studyTableFolderPath
        wait
        python3 uploadUKBBtoDatabase.py "$password" $ukbbTablesFolderPath
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

#============Create Association and Clumps download files ============================================
    if [ $clumpAssociationDownloadFiles == "true" ]; then
        echo "Creating Association and Clumps download files"
        python3 createServerAssociAndClumpsFiles.py $password
        wait
    fi

    read -p "Press [Enter] key to finish..."
fi
