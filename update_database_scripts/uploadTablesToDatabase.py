import mysql.connector
from mysql.connector import errorcode
import os
from sys import argv
from time import sleep

# This script uploads the associations_table.tsv and the study_table.tsv to the PRSKB database.
#
# How to run: python3 uploadTablesToDatabase.py "password" "associationTableFolderPath" "studyTableFolderPath"
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
def createTable(cursor, dbTableName, tableColumns):
    sql = "CREATE TABLE `" + dbTableName + "` " + tableColumns + ";"

    cursor.execute(sql)
    cursor.close()

# removes the table in fileNames if it exists and creates a new table
def createFreshTable(config, dbTableName, tableColumns):
    connection = getConnection(config)

    dropped = False
    # drop the table if it already exists
    if checkTableExists(connection.cursor(), dbTableName):
        deleteTable(connection.cursor(), dbTableName)
        dropped = True
    # create a new table with the table columns specified
    createTable(connection.cursor(), dbTableName, tableColumns)
    if dropped:
        print(dbTableName + " recreated")
    else:
        print(dbTableName + " created")
    connection.close()

# This is mostly here to document what the studyMaxes table is, it currently is not called anywhere
def addStudyMaxesView(config):
    connection = getConnection(config)
    sql = "CREATE VIEW studyMaxes AS SELECT trait, max(cohort) AS cohort, max(altmetricScore) as altmetricScore FROM " + \
            "(SELECT trait, max(initialSampleSize+replicationSampleSize) AS cohort, max(altmetricScore) AS altmetricScore FROM study_table GROUP BY trait " + \
            "UNION ALL SELECT reportedTrait AS trait, max(initialSampleSize+replicationSampleSize) AS cohort, max(altmetricScore) AS altmetricScore FROM study_table GROUP BY reportedTrait) " + \
            "AS intermediate GROUP BY trait ORDER BY trait;"
    cursor = connection.cursor()
    cursor.execute(sql)
    cursor.close()

# gets the line ending pattern ("\n" or "\r\n") from the file at the given filePath; the line ending is then used outside of this function to upload the
# file to the mysql database with the correct line ending
def getFileLineEnding(filePath):
    # assume "\n" ending
    ending = "\n"
    # open the file in binary to keep "\r" if they exist
    with open(filePath, "rb") as readFile:
        # get the first line
        line = readFile.readline()
        # check what the ending of the line is using binary strings
        if line.endswith(b"\r\n"):
            ending = "\r\n"
        elif line.endswith(b"\n\r"):
            ending = "\n\r"
    # return the string form of the endings containing backslashes and not the literal ending
    return repr(ending)

# the same as the addDataToTable function except if there is an exception, it waits and then attepts to excecute addDataToTable again (this catches the 
# occational hitch where the table isn't created before the program tries to add data to it)
def addDataToTableCatch(config, tablesFolderPath, tableName, dbTableName):
    try:
        addDataToTable(config, tablesFolderPath, tableName, dbTableName)
    except:
        # wait 100 milliseconds, then try running addDataToTable again
        print(dbTableName + ": failed to add data. Trying again in 100 milliseconds.")
        sleep(0.1)
        addDataToTable(config, tablesFolderPath, tableName, dbTableName)

# adds "tableName" tsv data to the "dbTableName" table of the database
def addDataToTable(config, tablesFolderPath, tableName, dbTableName):
    connection = getConnection(config)
    cursor = connection.cursor()
    path = os.path.join(tablesFolderPath, tableName + ".tsv")
    path = path.replace("\\", "/")
    lineEnding = getFileLineEnding(path)
    # character set latin1 is required for some of the tables containing non English characters in their names
    sql = 'LOAD DATA LOCAL INFILE "' + path + '" INTO TABLE `' + dbTableName + \
        '`CHARACTER SET utf8 COLUMNS TERMINATED BY "\t" LINES TERMINATED BY ' + lineEnding + ' IGNORE 1 LINES;'
    cursor.execute(sql)
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
        'auth_plugin': 'mysql_native_password'
    }

    connection = getConnection(config)

    # before adding data, sets a parameter so data can be loaded from local files
    enableLocalLoad(connection.cursor())
    connection.close()

    # add the associations_table to the database
    tableColumns = "( id int unsigned not null, snp varchar(20), hg38 varchar(50), hg19 varchar(50), hg18 varchar(50), hg17 varchar(50), \
        trait varchar(255), gene varchar(255), raf float, riskAllele varchar(20), pValue double, pValueAnnotation varchar(255), oddsRatio float, \
        lowerCI float, upperCI float, betaValue float, betaUnit varchar(50), betaAnnotation varchar(255), ogValueTypes varchar(20), sex varchar(20), \
        numRSFiltered int unsigned, citation varchar(50), studyID varchar(20), INDEX (trait, studyID) )"
    createFreshTable(config, "associations_table", tableColumns)
    addDataToTableCatch( config, associationTableFolderPath, "associations_table", "associations_table")

    # add the study_table to the database
    tableColumns = "( studyID varchar(20), pubMedID varchar(20), trait varchar(255), reportedTrait varchar(255), citation varchar(50), \
        altmetricScore decimal(15,5), ethnicity varchar(255), superPopulation varchar(255), initialSampleSize int unsigned, \
        replicationSampleSize int unsigned, sexes varchar(20), pValueAnnotations varchar(255), betaAnnotations varchar(255), ogValueTypes varchar(20), \
        numAssociationsFiltered int unsigned, title varchar(255), lastUpdated varchar(15) )"
    createFreshTable(config, "study_table", tableColumns)
    addDataToTableCatch(config, studyTableFolderPath, "study_table", "study_table")

    print("Finished uploading association and study tables to the PRSKB database.")
    

if __name__ == "__main__":
    main()
