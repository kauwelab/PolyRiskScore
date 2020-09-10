import csv
import datetime
import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import os
from os import getcwd
from sys import argv

# returns a string representation of the date format of the date given the date format is 
# obtained by trying different date formats until the correct one is found
def getDateFormat(date):
    dateFormat = "%m/%d/%Y"
    # if the month-first format doesn't work, try the year-first format and update the format
    try:
        datetime.datetime.strptime(date, dateFormat)
        return dateFormat
    except ValueError:
        dateFormat = "%Y-%m-%d"
        # if the year-first format doesn't work, exit with a custom error
        try:
            datetime.datetime.strptime(date, dateFormat)
            return dateFormat
        except ValueError:
            exit("Error: day " + date + " has an irregular date format.")

# returns the database study table in dictionary format where:
# key: studyID
# value: [pubMedID, trait, lastUpdated]
def getDatabaseStudyTable(config):
    databaseStudyTableDict = {}
    # open database connections
    connection = getConnection(config)
    cursor = connection.cursor()

    # select relevent rows from the study_table in the PRSKB database
    sql = ("SELECT studyID, pubMedID, trait, lastUpdated FROM study_table")
    cursor.execute(sql)

    # turn the sql statement results into a dictionary
    dateFormat = ""
    for (studyID, pubMedID, trait, lastUpdated) in cursor:
        # if the date format hasn't been found yet, find it (this has to be done in the for loop)
        # so that no row is lost from the cursor
        if dateFormat == "":
            dateFormat = getDateFormat(lastUpdated)
        lastUpdatedDate = datetime.datetime.strptime(lastUpdated, dateFormat)
        databaseStudyTableDict[studyID] = [pubMedID, trait, lastUpdatedDate]
    
    # close database connections
    cursor.close()
    connection.close()

    return databaseStudyTableDict

# returns the new updated study table in dictionary format where:
# key: studyID
# value: [pubMedID, trait, lastUpdated]
def getNewStudyTable(config, studyTableFolderPath):
    newStudyTable = {}
    # open the new study_table.csv
    with open(studyTableFolderPath, "r", encoding="utf8") as studyTable:
        headerlineItems = studyTable.readline().strip().replace("\"", "").split(",")
        studyIDIndex = headerlineItems.index("studyID")
        pubMedIDIndex = headerlineItems.index("pubMedID")
        traitIndex = headerlineItems.index("trait")
        lastUpdatedIndex = headerlineItems.index("lastUpdated")

        # read the table into a dictionary
        dateFormat = ""
        reader = csv.reader(studyTable)
        for row in reader:
            studyID =  row[studyIDIndex]
            pubMedID =  row[pubMedIDIndex]
            trait =  row[traitIndex]
            lastUpdated =  row[lastUpdatedIndex]
            if dateFormat == "":
                dateFormat = getDateFormat(lastUpdated)
            lastUpdatedDate = datetime.datetime.strptime(lastUpdated, dateFormat)

            newStudyTable[studyID] = [pubMedID, trait, lastUpdatedDate]

    return newStudyTable

# returns two sets, updatedStudies and updatedTraits, where entries of each are based on differences
# between the databaseStudyTable and newStudyTable dictionaries. If an key is in the newStudyTable, but 
# not in the databaseStudyTable, or if the date of an entry in newStudyTable is newer than the same 
# entry in the databaseStudyTable, it is added to updatedStudies and the corresponding trait is added
# to updatedTraits.
def getUpdatedStudiesAndTraits(databaseStudyTable, newStudyTable):
    updatedStudies = set()
    updatedTraits = set()

    # go through all studies in the new study table
    for newStudyTableID in newStudyTable.keys():
        # if the study is also in the database study table
        if newStudyTableID in databaseStudyTable:
            # save the like values from both dictionaries
            newDictVal = newStudyTable[newStudyTableID]
            databaseDictVal = databaseStudyTable[newStudyTableID]

            # get the dates from the like values of the dictionaries
            databaseDate = databaseDictVal[2]
            newDate = newDictVal[2]
            # check if the study has been updated
            if newDate > databaseDate:
                # add study
                updatedStudies.add(newStudyTableID)
                # add trait
                updatedTraits.add(newDictVal[1])
                print("\"{}\" was updated for: {}".format(newStudyTableID, newDictVal[1]))
            # if the date of the new table is older than the database table, print a warning- this shouldn't happen!
            elif newDate < databaseDate:
                print("Warning: the new date from the study table is older than the database date. This shouldn't happen!")
        # if the study is not in the database study table, add it to the set to be updated
        else:
            # add study
            updatedStudies.add(newStudyTableID)
            # add trait
            updatedTraits.add(newDictVal[1])
            print("The new study \"{}\" was added to: {}".format(newStudyTableID, newStudyTable[newStudyTableID][1]))

    return updatedStudies, updatedTraits

# TODO duplicated method from uploadTablesToDatabase.py script
# creates a connection to the MySQL database using the given config dictionary
# The config should be given in the following form:
# {'user': 'the user(polyscore)', 'password': argv[1], 'host': 'localhost', 'database': 'the database(polyscore)', 'allow_local_infile': True, 'auth_plugin': 'mysql_native_password',}
def getConnection(config):
    try:
        connection = mysql.connector.connect(**config)
        # sets all queries to commit automatically so commiting is not required
        connection.autocommit = True
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            exit("Incorrect username or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            exit("Database does not exist")
        else:
            exit(err)
    else:
        return connection

# prints the usage statement
def usage():
    print("""Usage: getUpdatedStudiesAndTraitsLists.py password studyTableFolderPath
        password- the MySQL password
        studyTableFolderPath- the path to the folder containing the study table (study_table.csv)
    """)

def main():
    # the password for connecting to the database
    password = ""
    # the location of the study table
    studyTableFolderPath = ""
    # a list of the studies that have been updated
    updatedStudies = set()
    # a list of traits that have been updated
    updatedTraits = set()

    # arg handling for password
    if len(argv) <= 1:
        # if no password is provided, ask for one and close
        print("Password is required!")
        usage()
        exit("Password is required!")
    else:
        password = argv[1]
    
    # arg handling for study folder path
    if len(argv) <= 2:
        studyTableFolderPath = getcwd().replace("\\", "/") + "/study_table.csv"
        print("Using default study table path: \"" + studyTableFolderPath + "\"")
    else:
        studyTableFolderPath = argv[2] + "/study_table.csv"
    
    #if there are too many arguments, quit
    if len(argv) > 3:
        # if too many arguments are provided
        print("Too many arguments!")
        usage()
        exit("Too many arguments: " + str(argv))

    # set other default variables
    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'allow_local_infile': True,
        'auth_plugin': 'mysql_native_password',
    }

    # get database and new study tables as dictionaries
    databaseStudyTableDict = getDatabaseStudyTable(config)
    newStudyTableDict = getNewStudyTable(config, studyTableFolderPath)

    # get the updated differences between the old and new study tables
    updatedStudies, updatedTraits = getUpdatedStudiesAndTraits(databaseStudyTableDict, newStudyTableDict)

    # print the updates so the master_script.sh can read them
    if len(updatedStudies) != 0:
        print("|".join(updatedStudies))
        print("|".join(updatedTraits))
    # if the sets are empty, print "none" which the master_script will interpret as empty
    # printing "" doesn't show up in the bash script variable
    else:
        print("none")
        print("none")

if __name__ == "__main__":
    main()