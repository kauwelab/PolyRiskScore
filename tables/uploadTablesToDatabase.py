import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import os
from os import listdir
from os.path import isfile, join
from sys import argv

import datetime
import time

# creates a connection to the MySQL database using the given config dictionary
# The config should be given in the following form:
#{'user': 'the user(polyscore)', 'password': argv[1], 'host': 'localhost', 'database': 'the database(polyscore)', 'allow_local_infile': True, 'auth_plugin': 'mysql_native_password',}
def getConnection(config):
    try:
        connection = mysql.connector.connect(**config)
        # sets all queries to commit automatically so commiting is not required
        connection.autocommit = True
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Something is wrong with your user name or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
        else:
            print(err)
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
    sql = "set names utf8mb4; SET @query = 'CREATE TABLE `" + dbTableName + "` " + tableColumns + "PREPARE stmt FROM @query;" + "EXECUTE stmt;" + "DEALLOCATE PREPARE stmt;"
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

# adds 'tableName' csv data to the 'dbTableName' table of the database
def addDataToTable(config, tablesFolderPath, tableName, dbTableName):
    connection = getConnection(config)
    cursor = connection.cursor()
    path = tablesFolderPath + tableName + ".csv"
    path = path.replace("\\", "/")
    # character set latin1 is required for some of the tables containing non English characters in their names
    sql = 'LOAD DATA LOCAL INFILE "' + path + '" INTO TABLE `' + dbTableName + '`CHARACTER SET latin1 COLUMNS TERMINATED BY "," ENCLOSED BY \'"\' LINES TERMINATED BY "\n" IGNORE 1 LINES;'
    cursor.execute(sql, multi=True)
    print(dbTableName + " data added")
    cursor.close()
    connection.close()

#gets the names of all the tables in the database
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

#enables tables to be loaded from local files temporarily
def enableLocalLoad(cursor):
    sql = "SET GLOBAL local_infile = 1;"
    cursor.execute(sql)
    cursor.close()

#prints the usage statement
def usage():
    print("""Usage: password cleanDatabaseBoolean commaSeparatedTableString
    password- the MySQL password
    cleanDatabaseBoolean- optional boolean- if true or t, removes all non updated tables from the DB
    commaSeparatedTableString- optional list of table names to update, separated by a comma and a space (ex: "ad, als")
    """)


def main():
    #the location of the study and trait tables
    studyAndTraitFolderPath = os.getcwd().replace("\\", "/") + "/"
    #the location of the association tables 
    associationTablesFolderPath = studyAndTraitFolderPath + "/association_tables/"
    #if no password is provided, as for one and close
    if len(argv) <= 1:
        print("Password is required!")
        usage()
        exit()
    #set default variables
    config = {
            'user': 'polyscore',
            'password': argv[1],
            'host': 'localhost',
            'database': 'polyscore',
            'allow_local_infile': True,
            'auth_plugin': 'mysql_native_password',
        }
    tablesToUpdate = []
    connection = getConnection(config)

    #if argv[2] is "true" or "t", removes all the tables in the database not listed in argv[3] or if argv[3] is not specified,
    #removes the all the tables in the database that are not csvs in the associationTablesFolderPath folder
    if len(argv) > 2:
        if argv[2].lower() == "true" or argv[2].lower() == "t":
            existingTables = getAllExistingTables(connection.cursor())
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
    #gets the names of the tables to update from argv[3], or if there is no argv[3], 
    #gets the tables to update from the csvs in the associationTablesFolderPath folder
    if len(argv) > 3:
        tablesToUpdate = argv[3].split(', ')
        print("Updating tables: " + str(tablesToUpdate))
    else:
        tablesToUpdate = [f[:-4] for f in listdir(associationTablesFolderPath) if f[-4:] == ".csv"]
        print("Using default tables found in the current working directory.")

    # before adding data, sets a parameter so data can be loaded from local files
    enableLocalLoad(connection.cursor())
    connection.close()

    # for each table, create a fresh table and add the data in the current directory with that table name to it
    for tableName in tablesToUpdate:
        dbTableName = getDatabaseTableName(tableName)
        createFreshTable(config, tableName, dbTableName)
        addDataToTable(config, associationTablesFolderPath, tableName, dbTableName)

    #add the study_table and trait_tables to the database
    createFreshTable(config, "study_table", "study_table")
    addDataToTable(config, studyAndTraitFolderPath, "study_table", "study_table")
    print("Done!")


if __name__ == "__main__":
    main()