import os
from sys import argv
from time import sleep
import glob
from uploadTablesToDatabase import getConnection, checkTableExists, deleteTable, createTable, createFreshTable, getFileLineEnding, enableLocalLoad, setPathWithCheck

def addDataToMAFTableCatch(config, tablesFolderPath, chrNum, dbTableName, tableColumns):
    try:
        addDataToMAFTable(config, tablesFolderPath, chrNum, dbTableName, tableColumns)
    except:
        # wait 100 milliseconds, then try running addDataToTable again
        print(dbTableName + ": failed to add data. Trying again in 100 milliseconds.")
        sleep(0.1)
        addDataToMAFTable(config, tablesFolderPath, chrNum, dbTableName, tableColumns)


def addDataToMAFTable(config, tablesFolderPath, chrNum, dbTableName, tableColumns):
    connection = getConnection(config)
    cursor = connection.cursor()
    lineEnding = getFileLineEnding(tablesFolderPath)
    # character set latin1 is required for some of the tables containing non English characters in their names
    sql = 'LOAD DATA LOCAL INFILE "' + tablesFolderPath + '" INTO TABLE `' + dbTableName + '` '+ \
        ' CHARACTER SET utf8 COLUMNS TERMINATED BY "\t" LINES TERMINATED BY ' + lineEnding + tableColumns + ';'
    cursor.execute(sql)
    print(dbTableName + " data added")
    cursor.close()
    connection.close()


# prints the usage statement
def usage():
    print("""Usage: uploadMAFDataToDatabase.py password tablesFolderPath
        password- the MySQL password
        tablesFolderPath- the path to the folder containing the maf tables
    """)


def main():
    # the password for connecting to the database
    password = ""
    # the location of the tables
    mafTablesFolderPath =  "../tables/maf"
    mafDirectories = ["ADNI_MAF", "AFR_MAF", "AMR_MAF", "EAS_MAF", "EUR_MAF", "SAS_MAF", "UKBB_MAF"]

    # arg handling
    if len(argv) <= 1:
        # if no password is provided, ask for one and close
        print("Password is required!")
        usage()
        exit()
    else:
        password = argv[1]
    if len(argv) > 3:
        # if too many arguments are provided
        print("Too many arguments: " + str(argv))
        usage()
        exit()
    if len(argv) == 3:
        mafTablesFolderPath = setPathWithCheck(argv[2])

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

    tableColumns = "( ID int AUTO_INCREMENT PRIMARY KEY, chrom tinyint, pos int unsigned, snp varchar(50), allele text, alleleFrequency double )"
    tableColumnsWOid = "( chrom, pos, snp, allele, alleleFrequency )"

    # create the cohort tables
    # then fill them
    for i in range(1,23):
        for directory in mafDirectories:
            pathToFile = '{}/{}'.format(mafTablesFolderPath, directory)
            if os.path.isdir(pathToFile):
                fileName = glob.glob('{}/*chr{}_*.tsv'.format(pathToFile, i))
                if isinstance(fileName, list) and len(fileName) > 1:
                    print("There are too many files that have chr{} in them in {}".format(i, pathToFile))
                    print("Not loading this chromosome into the table")
                elif len(fileName) == 1:
                    tableName = directory.lower() + '_chr' + str(i)
                    path = fileName[0].replace("\\", "/")
                    createFreshTable(config, tableName, tableColumns)
                    addDataToMAFTableCatch(config, path, i, tableName, tableColumnsWOid)
                else:
                    print("we have zero filenames that match this chr{} : {} ".format(i, pathToFile))

    print("Finished uploading maf data to the PRSKB database!")


if __name__ == "__main__":
    main()
