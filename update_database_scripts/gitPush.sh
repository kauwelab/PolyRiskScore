#!/usr/bin/expect -f

# This script uses "expect" instead of bash to push committed files to the GitHub project. "except" allows the script to automatically return the GitHub
# user name and password to the "git pull" command when they are requested.
#
# How to run: ./gitPush.sh $gitUsername $gitPassword
# where: "gitUsername" is the username for the GitHub project.
#        "gitPassword" is the password for the GitHub project.

set timeout -1
set username [lindex $argv 0]
set gitPassword [lindex $argv 1]

spawn git push origin master
expect "Username for 'https://github.com': "
send -- "$username\r"
expect "Password for 'https://$username@github.com': "
send -- "$gitPassword\r"
expect eof
