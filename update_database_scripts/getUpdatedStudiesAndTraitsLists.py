import csv
import datetime
import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import os
from os import getcwd
from sys import argv

# returns a dictionary from the database with the following format:
# key: studyID
# value: [pubMedID, trait, lastUpdated]
def getDatabaseStudyTable(config):
    databaseStudyTableDict = {}
    connection = getConnection(config)
    cursor = connection.cursor()

    sql = ("SELECT studyID, pubMedID, trait, lastUpdated FROM study_table")

    cursor.execute(sql)
    for (studyID, pubMedID, trait, lastUpdated) in cursor:
        databaseStudyTableDict[studyID] = [pubMedID, trait, lastUpdated]

    cursor.close()
    connection.close()
    return databaseStudyTableDict

# returns a dictionary from the new study table with the following format:
# key: studyID
# value: [pubMedID, trait, lastUpdated]
def getNewStudyTable(config, studyTableFolderPath):
    newStudyTable = {}
    with open(studyTableFolderPath, "r", encoding="utf8") as studyTable:
        headerlineItems = studyTable.readline().strip().replace("\"", "").split(",")
        studyIDIndex = headerlineItems.index("studyID")
        pubMedIDIndex = headerlineItems.index("pubMedID")
        traitIndex = headerlineItems.index("trait")
        lastUpdatedIndex = headerlineItems.index("lastUpdated")

        reader = csv.reader(studyTable)
        for row in reader:
            studyID =  row[studyIDIndex]
            pubMedID =  row[pubMedIDIndex]
            trait =  row[traitIndex]
            lastUpdated =  row[lastUpdatedIndex]
            newStudyTable[studyID] = [pubMedID, trait, lastUpdated]


    return newStudyTable

def getUpdatedStudiesAndTraits(databaseStudyTable, newStudyTable):
    updatedStudies = set()
    updatedTraits = set()

    # go through all studies in the new study table
    for newStudyTableID in newStudyTable.keys():
        # if the study is also in the database study table
        if newStudyTableID in databaseStudyTable:
            newDictVal = newStudyTable[newStudyTableID]
            databaseDictVal = databaseStudyTable[newStudyTableID]

            databaseDate = datetime.datetime.strptime(databaseDictVal[2], "%Y-%m-%d")
            newDate = datetime.datetime.strptime(newDictVal[2], "%Y-%m-%d")
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
        # if the study is not in the database study table, add it to the set to be updated!
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
    studiesUpdated = []
    # a list of traits that have been updated
    traitsUpdated = []

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
        #TODO
        studyTableFolderPath = getcwd().replace("\\", "/") + "/study_table_new.csv"
        print("Using default study table path: \"" + studyTableFolderPath + "\"")
    else:
        studyTableFolderPath = argv[2] + "/study_table_new.csv"
    
    #if there are too many arguments, quit
    if len(argv) > 3:
        # if too many arguments are provided
        print("Too many arguments!")
        usage()
        exit("Too many arguments!" + str(argv))

    # set other default variables
    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'allow_local_infile': True,
        'auth_plugin': 'mysql_native_password',
    }

    databaseStudyTableDict = getDatabaseStudyTable(config)
    newStudyTableDict = getNewStudyTable(config, studyTableFolderPath)

    updatedStudies, updatedTraits = getUpdatedStudiesAndTraits(databaseStudyTableDict, newStudyTableDict)

    print(updatedStudies)
    print(updatedTraits)

if __name__ == "__main__":
    main()