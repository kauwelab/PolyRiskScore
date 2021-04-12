from os import path
from sys import argv

INVALID_NUM_ARGS = "Invalid number of arguments."
INVALID_PASS = "Invalid password type."
INVALID_PATH = "Invalid file path."

# This script returns a password given a file path and a password type string. If the file path and password type 
# string are valid, a password is returned, otherwise an error message is returned.
# It is assumed that the file at the file path contains a collection of JavaScript methods. The password type string
# is the name of one of the methods of the file. The password then, is the return of the method named after the 
# password type. It is also assumed that the return of the method is on the line right after the method definition.
# Ex:
# function passwordTypeString() {
#   return 'password'
# }
# In the above example, if the password type string was "passwordTypeString" this script would return "password"
# 
# How to run: python3 passwordGetter.py "filePath" "passwordTypeString"
# where: "filePath" is the path to the passwords file
#        "passwordTypeString" is the name of the password to be accessed


# reads the passwords file at filePath, searching for the method associated with the passwordType string
# if found, gets the password for the password type from the return statement of the passwordType method, 
# otherwise, returns the invalid password or path message
def getPassword(filePath, passwordType):
    if path.exists(filePath):
        with open(filePath) as newFile:
            lines = newFile.readlines()
            for i in range(len(lines)):
                line = lines[i].strip()
                if passwordType in line:
                    return lines[i+1].strip().replace("return ", "").replace("'", "")
        return INVALID_PASS
    return INVALID_PATH


# takes in a filePath string and passwordType string, calls getPassword, and returns the result
# or a message if the number of args is not enough
def main():
    if len(argv) > 2:
        filePath = argv[1]
        passwordType = argv[2]
        password = getPassword(filePath, passwordType)
        return password
    else:
        return INVALID_NUM_ARGS

if __name__ == "__main__":
    main()
    