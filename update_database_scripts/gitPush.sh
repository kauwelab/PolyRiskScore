#!/usr/bin/expect -f

set timeout -1
set username [lindex $argv 0]
set gitPassword [lindex $argv 1]

spawn git push Polyscore master-script-speed-up
expect "Username for 'https://github.com': "
send -- "$username\r"
expect "Password for 'https://$username@github.com': "
send -- "$gitPassword\r"
expect eof
