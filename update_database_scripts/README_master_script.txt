All the files and scripts in this folder are for automatically downloading, processing, and uploading data from the NHGRI-EBI GWAS Catalog. The following 
is a tutorial on what each script does and how they work together. This README is primarily for those responsible for the upkeep of the PRSKB server.

----Cron Job----
The PRSKB server has a cron job responsible for updating the database on the first day of each month. 
The updateDatabaseCron.sh file contains the code that will be run every month and can be changed there. To edit the cron job itself:
1. ssh into the PRSKB server at lsprs.byu.edu with your username and password.
2. Type the following command to access the root user's cron jobs: sudo crontab -e -u root
3. Edit the line containing a path to the updateDatabaseCron.sh file. The line has three main parts:
	a. Numbers and stars representing the first day of each month (see any tutorial on cron jobs for more info)
	b. The command to be run, consisting of the path to the updateDatabaseCron.sh file, a path to the passwords file, and a path to where the output of the command will go
	c. 2>&1, which ensures the output of the commands will go to the file specified and not to an email

----Usage Without the Cron Job----
To update the PRSKB database manually (without using the cron job) with the latest studies from the NHGRI-EBI GWAS Catalog, follow the following steps:
1. ssh into the PRSKB server at lsprs.byu.edu with your username and password.
2. Navigate to the scripts folder where the website is stored: cd /var/www/prs.byu.edu/html/update_database_scripts/
3. Open a new tmux window by typing the following command: "tmux new -s session_name" where session_name is the name of the session you are starting.
   Opening a tmux window allows the scripts to run even when you are not logged onto the server.
    a. If tmux is not available, install it with the following command: "sudo apt-get install tmux"
    b. You can leave or come back to a tmux window at any time with "tmux detach" and "tmux a -t session_name" respectively. 
4. Run the following command, replacing "password" with the password for the PRSKB MySQL database or the path to the JavaScript file contaning the PRSKB MySQL password: 
   sudo ./master_script.sh "password" 8 &> output.txt &
    a. After running the command, make sure the script has started working by opening the output.txt file and confirming there are no errors.
        aa. If you get the error: "./master_script.sh: Permission denied" then do "chmod 777 master_script"
    b. See the master_script file for additional information on its parameters.
    c. This command will run in the background and write its terminal output to "output.txt" Remember, while in a tmux window, run "tmux detach" and the 
       command will continue to run in the detached tmux window.
    d. The "8" in the command is the number of times the GWAS catalog will be split to download different parts of the database concurrently. 
       Increase this number to speed up the download, but don't increase the number too much since the website computer only has 2 cores.
5. This command will take between 3-5 hours to run. It is done when the last line of "output.txt" says "Press [Enter] key to finish..." At this point, 
   all of the new data is already uploaded to the database. In addition, the updated tables and files will have been uploaded to GitHub.
6. If you run the master script, but then want to stop it, you can use the following process:
    a. When you ran the "./master_script.sh" command, it should have returned a number. This number is the PID, or the process ID for the background
       process you started. To stop it, do: sudo kill "PID" where PID is the number returned.
    b. If you have somehow lost the PID mentioned in the previous step, you can find it with the following process:
        i. Run: sudo ps -aux | less
        ii. Scroll until you find your command under the "COMMAND" column (choose the one that starts with "sudo" not "/bin/bash") Note the PID.
        iii. Exit "less" with "q" 
        iv. Execute sudo kill "PID" where PID is the number you found.

The following is a simplified description of the files in the update_database_scripts folder. They are listed in the order they are used when running 
the master_script. Please see the beginning of each of the files for command line parameters, usage, and additional information.

updaateDatabseCron.sh- A shell script that is run as a cron job the first day of each month. The cron job passes a password file path to the script
    and its output is stored in a file "output.txt" in the update_database_scripts folder.

master_script.sh- A shell script that calls the other files in the update_database_scripts folder to download, format, and upload new data from the 
    GWAS catalog to the PRSKB database. See the file for details on command line arguments.
	
passwordGetter.py- A Python file that, given a password file path and a password name, gets the specified password from the JavaScript password file.
    This file ensures that no passwords need to be manually coded into any scripts, especially the cron job scripts.

downloadStudiesToFile.R- An R script that downloads study, publication, and ancestry data for all GWAS catalog studies so each instance of the
	unpackDatabaseCommandLine.R doesn't have to (speeds up the process). These tables are written out as TSVs, but later deleted by the master_script after use.

unpackDatabaseCommandLine.R- An R script that downloads data from the GWAS catalog and formats it into a TSV table (associations_table.tsv) that can 
	be uploaded to the PRSKB database. This script can be run multiple times simultaneously on different portions of the GWAS catalog so the data can
	be downloaded faster. This script can also be used as a stand-alone script.

hg19ToHg17.over.chain, hg19ToHg18.over.chain, and hg38ToHg19.over.chain- These are three chain files used to convert coordinate systems between 
    reference genomes by the unpackDatabaseCommandLine.R script. The GWAS catalog only gives SNP locations in hg38, but these chain files allow the 
    unpackDatabaseCommandLine.R to convert hg38 locations to hg19, hg18, and hg17.

sortAssociationsTable.R- An R script that sorts the associations table after it has been generated by the multiple instances of the 
    unpackDatabaseCommandLine.R script. This script is necessary because it adds the "id" column to the associations table. It cannot be incorporated
    into the unpackDatabaseCommandLine.R script because of the multiple instances of that script that add rows to the associations table at the same time.

createStudyTable.R- This R script takes information from the association table TSV created by the unpackDatabaseCommandLine.R script as well as the 
    GWAS catalog to create a study_table.tsv file. The study table is a summary of all studies in the association table TSV and includes 
    additional information on each study, including the last time it was updated and the name of the study. This script takes around 10 minutes to run fully.

strandFlipping.py- This Python script goes through each line of the associations_table.tsv and checks to see if the allele needs to be flipped to its complement. 
    This uses the myvariant packages to grab viable alleles for the snp. This script can be run independently of the master_script.

uploadTablesToDatabase.py- This Python script uploads the new association table and study table to the PRSKB database. This script can also be run by 
    itself, independently of the master_script.

createSampleVCF.py- A Python script that generates a new sample VCF once all new data has been added to the server. It takes a single SNP from each
    study and has three samples representing ref/ref, ref/alt, and alt/alt alleles.

create_rsID_file_from_vcf.py- A Python script that generates a new sample rsID TXT file based on the VCF file generated by the createSampleVCF.py file.
	Unlike the aforementioned script however, the new TXT file only has one sample, ref/alt.

createServerAssociAndClumpsFiles.py- A Python script that generates association and clump files that can be downloaded using the CLI. The generated files
    are stored directly on the server rather than in the database.

gitPush.sh- A shell script running "except" instead of bash that pushes the currently committed files to GitHub. It uses "except" to automatically input the 
    user name and password for GitHub when they are requested.
    