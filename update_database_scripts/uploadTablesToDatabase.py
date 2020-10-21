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

# This script uploads the associations_table.tsv and the study_table.tsv to the PRSKB database.
#
# How to run: python3 uploadTablesToDatabase.py "password" "tablesFolderPath"
# where: "password" is the password to the PRSKB database
#        "associationTableFolderPath" is the path to the associations_table.tsv (default: "../tables")
#        "studyTableFolderPath" is the path to the study_table.tsv (default: "../tables")

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

# returns true if "tableName" exists in the MySQL database
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

# deletes "dbTableName" from the database
def deleteTable(cursor, dbTableName):
    if dbTableName == "studyMaxes":
        cursor.close()
        return
    sql = "DROP TABLE `" + dbTableName + "`;"
    cursor.execute(sql)
    cursor.close()

# creates "dbTableName" and adds it to the database with no data
def createTable(cursor, dbTableName):
    tableColumns = ""
    if dbTableName == "study_table":
        tableColumns = "( studyID varchar(20), pubMedID varchar(20), trait varchar(255), reportedTrait varchar(255), citation varchar(50), altmetricScore float, ethnicity varchar(255), initialSampleSize int unsigned, replicationSampleSize int unsigned, title varchar(255), lastUpdated varchar(15) )';"
    else:
        tableColumns = "( id int unsigned not null, snp varchar(20), hg38 varchar(50), hg19 varchar(50), hg18 varchar(50), hg17 varchar(50), gene varchar(255), raf float, riskAllele varchar(20), pValue double, pValueAnnotation varchar(255), oddsRatio float, lowerCI float, upperCI float, citation varchar(50), studyID varchar(20) )';"
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

# This is mostly here to document what the studyMaxes table is, it currently is not called anywhere
def addStudyMaxesView(config):
    connection = getConnection(config)
    sql = "CREATE VIEW studyMaxes AS SELECT trait, max(cohort) AS cohort, max(studyScore) as studyScore FROM " + \
            "(SELECT trait, max(cohort) AS cohort, max(studyScore) AS studyScore FROM study_table GROUP BY trait" + \
            "UNION ALL SELECT reportedTrait AS trait, max(cohort) AS cohort, max(studyScore) AS studyScore FROM study_table GROUP BY reportedTrait)" + \
            "AS intermediate GROUP BY trait ORDER BY trait;"
    cursor = connection.cursor()
    cursor.execute(sql)
    cursor.close()

# the same as the addDataToTable function except if there is an exception, it waits and then attepts to excecute addDataToTable again (this catches the 
# occational hitch where the table isn't created before the program tries to add data to it)
def addDataToTableCatch(config, tablesFolderPath, tableName, dbTableName):
    try:
        addDataToTable(config, tablesFolderPath, tableName, dbTableName)
    except:
        # wait 100 milliseconds, then try runnin addDataToTable again
        print(dbTableName + ": failed to add data. Trying again in 100 milliseconds.")
        sleep(0.1)
        addDataToTable(config, tablesFolderPath, tableName, dbTableName)

# adds "tableName" csv data to the "dbTableName" table of the database
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

# enables tables to be loaded from local files temporarily
def enableLocalLoad(cursor):
    sql = "SET GLOBAL local_infile = 1;"
    cursor.execute(sql)
    cursor.close()

# prints the usage statement
def usage():
    print("""Usage: uploadTablesToDatabase.py password tablesFolderPath
        password- the MySQL password
        tablesFolderPath- the path to the folder containing the study table (study_table.tsv) and associations table (associations_table.tsv)
    """)

# returns the path if it is valid, otherwise exits the program
def setPathWithCheck(path):
    if (os.path.isdir(path)):
        return path
    else:
        print("\"" + path + "\" is not an existing path. Please check your arguments and try again.")
        exit(1)

def main():
    # the password for connecting to the database
    password = ""
    # the location of the tables
    studyTableFolderPath =  "../tables/"
    associationTableFolderPath = "../tables/"

    # arg handling
    if len(argv) <= 1:
        # if no password is provided, ask for one and close
        print("Password is required!")
        usage()
        exit()
    else:
        password = argv[1]
    if len(argv) > 4:
        # if too many arguments are provided
        print("Too many arguments: " + str(argv))
        usage()
        exit()
    if len(argv) >= 3:
        associationTableFolderPath = setPathWithCheck(argv[2])
    if len(argv) == 4:
        studyTableFolderPath = setPathWithCheck(argv[3])

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

    # before adding data, sets a parameter so data can be loaded from local files
    enableLocalLoad(connection.cursor())
    connection.close()

    # add the associations_table to the database
    createFreshTable(config, "associations_table.tsv", "associations_table")
    addDataToTableCatch( config, associationTableFolderPath, "associations_table.tsv", "associations_table")

    # add the study_table to the database
    createFreshTable(config, "study_table.tsv", "study_table")
    addDataToTableCatch(config, studyTableFolderPath, "study_table.tsv", "study_table")

    print("Done!")

if __name__ == "__main__":
    main()
