# This script is run the first of every month on the PRSKB server through a cron job. To edit the cron job, which is found in roots cron jobs, use the
# following command: sudo crontab -e -u root
# The line containing the file name of this file is the line to change. For a better description of the cron job, see the master script readme file.
#
# How to run: ./updateDatabasecron.sh "filePath"
# where: "filePath" is the path to the passwords file

# cd to where the master script is stored
cd /var/www/prs.byu.edu/html/update_database_scripts/
# runs the master script with the password path specified by $1 with 8 subprocesses downloading association data
./master_script.sh $1 8
