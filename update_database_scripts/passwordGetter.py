from os import path
from sys import argv

INVALID_NUM_ARGS = "Invalid number of arguments."
INVALID_PASS = "Invalid password type."
INVALID_PATH = "Invalid file path."

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
    