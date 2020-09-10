import distutils.core
import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import os
from os import listdir
from os.path import isfile, join
from sys import argv
from time import sleep

import datetime
import time

# args:
# 1. password
# 2. path to association csv tables (default: "./association_tables/")
# 3. path to study table (dafault: ".")
# 4. boolean indicating whether the database should be cleaned of all tables except the ones in arg 4,
#    or if arg 4 is blank, the tables found at arg 2 (default: false)
# 5. a pipe (|) separated list of trait names to be updated (default: "", or all tables 
#    found in arg 2) ex: "Alzheimer's disease|acne|osteoarthritis, hip"

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
            print("Incorrect username or password")
            exit()
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
            exit()
        else:
            print(err)
            exit()
    else:
        return connection

# returns true if 'tableName' exists in the MySQL database
def checkTableExists(cursor, tableName):
    exists = False
    cursor.execute("""
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_name = '{0}'
        """.format(tableName.replace('\'', '\'\'')))
    if cursor.fetchone()[0] == 1:
        exists = True

    cursor.close()
    return exists

# deletes 'dbTableName' from the database
def deleteTable(cursor, dbTableName):
    if dbTableName == "studyMaxes":
        cursor.close()
        return
    sql = "DROP TABLE `" + dbTableName + "`;"
    cursor.execute(sql)
    cursor.close()

# creates 'dbTableName' and adds it to the database with no data
def createTable(cursor, dbTableName):
    tableColumns = ""
    if dbTableName == "study_table":
        tableColumns = "( studyID varchar(20), pubMedID varchar(20), trait varchar(255), citation varchar(50), studyScore varchar(10), ethnicity varchar(255), cohort int unsigned, title varchar(255), lastUpdated varchar(15) )';"
    else:
        tableColumns = "( id int unsigned not null, snp varchar(20), hg38 varchar(50), hg19 varchar(50), hg18 varchar(50), hg17 varchar(50), gene varchar(255), raf float, riskAllele varchar(20), pValue double, oddsRatio float, lowerCI float, upperCI float, citation varchar(50), studyID varchar(20) )';"
    sql = "set names utf8mb4; SET @query = 'CREATE TABLE `" + dbTableName + "` " + \
        tableColumns + "PREPARE stmt FROM @query;" + \
        "EXECUTE stmt;" + "DEALLOCATE PREPARE stmt;"
    cursor.execute(sql, multi=True)
    cursor.close()

# removes the table in fileNames if it exists and creates a new table
def createFreshTable(config, tableName, dbTableName):
    connection = getConnection(config)
    dropped = False
    # drop the table if it already exists
    if checkTableExists(connection.cursor(), dbTableName):
        deleteTable(connection.cursor(), dbTableName)
        dropped = True
    # create a new table with the table columns specified
    createTable(connection.cursor(), dbTableName)
    if dropped:
        print(dbTableName + " recreated")
    else:
        print(dbTableName + " created")
    connection.close()

# the same as the addDataToTable function except if there is an excception, it waits and
    # then attepts to excecute it addDataToTable again (this catches the occational hitch where
    # the table isn't created before the program tries to add data to it)
def addDataToTableCatch(config, tablesFolderPath, tableName, dbTableName):
    try:
        addDataToTable(config, tablesFolderPath, tableName, dbTableName)
    except:
        # wait 100 milliseconds, then try runnin addDataToTable again
        print(dbTableName + ": failed to add data. Trying again in 100 milliseconds.")
        sleep(0.1)
        addDataToTable(config, tablesFolderPath, tableName, dbTableName)

# adds 'tableName' csv data to the 'dbTableName' table of the database
def addDataToTable(config, tablesFolderPath, tableName, dbTableName):
    connection = getConnection(config)
    cursor = connection.cursor()
    path = os.path.join(tablesFolderPath, tableName + ".csv")
    path = path.replace("\\", "/")
    # character set latin1 is required for some of the tables containing non English characters in their names
    sql = 'LOAD DATA LOCAL INFILE "' + path + '" INTO TABLE `' + dbTableName + \
        '`CHARACTER SET latin1 COLUMNS TERMINATED BY "," ENCLOSED BY \'"\' LINES TERMINATED BY "\r\n" IGNORE 1 LINES;'
    cursor.execute(sql, multi=True)
    print(dbTableName + " data added")
    cursor.close()
    connection.close()

# gets the names of all the tables in the database
def getAllExistingTables(cursor):
    cursor.execute("SHOW tables")
    existingTableNames = []
    for (table_name,) in cursor:
        existingTableNames.append(table_name)
    cursor.close()
    return existingTableNames

# gets the trait name formated for website and database use
  # all lowercase, spaces to underscores, forward slashes to dashes, and no commas or apostrophies
def getDatabaseTableName(traitName):
    dbTableName = traitName.lower().replace(" ", "_").replace(
        ",", "").replace("/", "-").replace("'", "")[:64]
    return(dbTableName)

# enables tables to be loaded from local files temporarily
def enableLocalLoad(cursor):
    sql = "SET GLOBAL local_infile = 1;"
    cursor.execute(sql)
    cursor.close()

# prints the usage statement
def usage():
    print("""Usage: uploadTablesToDatabase.py password associationTablesFolderPath studyTableFolderPath cleanDatabase commaSeparatedTableString
        password- the MySQL password
        associationTablesFolderPath- the path to the association tables folder
        studyTableFolderPath- the path to the folder containing the study table (study_table.csv)
        cleanDatabase- optional boolean- if True, removes all non-updated tables from the DB
        commaSeparatedTableString- optional list of table names to update, separated by a comma and a space (ex: "ad, als")
    """)

# returns the path if it is valid, otherwise exits the program
def setPathWithCheck(path):
    if (os.path.isdir(path)):
        return path
    else:
        print("\"" + path + "\" is not an existing path. Please check your arguments and try again.")
        exit()

def main():
    # the password for connecting to the database
    password = ""
    # the location of the association tables
    associationTablesFolderPath = "./association_tables/"
    # the location of the study table
    studyTableFolderPath = os.getcwd().replace("\\", "/") + "/"
    # the boolean for whether the database should be cleaned of tables not found in "tablesToUpdate"
    cleanDatabase = False
    # a list of names of the tables that will be updated/added
    tablesToUpdate = []

    # arg handling
    if len(argv) <= 1:
        # if no password is provided, ask for one and close
        print("Password is required!")
        usage()
        exit()
    else:
        password = argv[1]
    if len(argv) > 6:
        # if too many arguments are provided
        print("Too many arguments: " + str(argv))
        usage()
        exit()

    if len(argv) >= 3:
        associationTablesFolderPath = setPathWithCheck(argv[2])
    if len(argv) >= 4:
        studyTableFolderPath = setPathWithCheck(argv[3])
    if len(argv) >= 5:
        cleanDatabase = bool(distutils.util.strtobool(argv[4]))
    if len(argv) == 6:
        tablesToUpdate = argv[5].split("|")

    # set other default variables
    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'allow_local_infile': True,
        'auth_plugin': 'mysql_native_password',
    }
    connection = getConnection(config)

    # if cleanDatabase is True, removes all the tables in the database not listed in tablesToUpdate or if argv[5] is not specified,
    # removes the all the tables in the database that are not csvs in the associationTablesFolderPath folder
    if cleanDatabase:
        # gets the names of all tables in the database
        existingTables = getAllExistingTables(connection.cursor())
        # removes names already in tablesToUpdate from the list of all database tables so they aren't deleted
        for tableName in tablesToUpdate:
            dbTableName = getDatabaseTableName(tableName)
            if dbTableName in existingTables:
                existingTables.remove(dbTableName)
        print(
            "You are about to remove the following tables from the database " + str(existingTables))
        if input("Are you sure? (y/n)") != "y":
            print("Aborted by user.")
            exit()
        else:
            print('Cleaning the database')
            for dbTableName in existingTables:
                deleteTable(connection.cursor(), dbTableName)
                print(dbTableName + " removed")
    # gets the names of the tables to update from the commaSeparatedTableString, or if there is no
    # commaSeparatedTableString, gets the tables to update from the csvs in the
    # associationTablesFolderPath folder
    if len(tablesToUpdate) > 0:
        # check to see if the table paths in the commaSeparatedTableString exist
        invalidTableNames = []
        for tableName in tablesToUpdate:
            pathToTableName = os.path.join(
                associationTablesFolderPath, tableName + ".csv")
            if not os.path.exists(pathToTableName):
                invalidTableNames.append(tableName)
        if len(invalidTableNames) > 0:
            print("The following csv tables don't exist: " +
                  str(invalidTableNames))
            print("Please check your commaSeparatedTableString variable and try again.")
            exit()
        else:
            # if all the csv tables exist, keep going
            print("Updating database tables: " + str(tablesToUpdate))
    else:
        tablesToUpdate = [f[:-4]
                          for f in listdir(associationTablesFolderPath) if f[-4:] == ".csv"]
        print("Adding tables to database found at: \"" +
              associationTablesFolderPath + "\"")

    # before adding data, sets a parameter so data can be loaded from local files
    enableLocalLoad(connection.cursor())
    connection.close()

    # for each table, create a fresh table and add the data in the current directory with that table name to it
    for tableName in tablesToUpdate:
        dbTableName = getDatabaseTableName(tableName)
        createFreshTable(config, tableName, dbTableName)
        addDataToTableCatch(
            config, associationTablesFolderPath, tableName, dbTableName)

    # add the study_table to the database
    createFreshTable(config, "study_table", "study_table")
    addDataToTableCatch(config, studyTableFolderPath,
                        "study_table", "study_table")

    print("Done!")

if __name__ == "__main__":
    main()
