import os
from sys import argv
from uploadTablesToDatabase.py import getConnection, checkTableExists, deleteTable, createTable, createFreshTable, getFileLineEnding, enableLocalLoad, setPathWithCheck

def addDataToUkbbTableCatch(config, tablesFolderPath, tableName, ext, dbTableName):
    try:
        addDataToUkbbTable(config, tablesFolderPath, tableName, dbTableName)
    except:
        # wait 100 milliseconds, then try running addDataToTable again
        print(dbTableName + ": failed to add data. Trying again in 100 milliseconds.")
        sleep(0.1)
        addDataToUkbbTable(config, tablesFolderPath, tableName, dbTableName)


def addDataToUkbbTable(config, tablesFolderPath, tableName, ext, dbTableName):
    connection = getConnection(config)
    cursor = connection.cursor()
    path = os.path.join(tablesFolderPath, tableName + ext)
    path = os.path.replace("\\", "/")
    lineEnding = getFileLineEnding(path)
    # character set latin1 is required for some of the tables containing non English characters in their names
    sql = 'LOAD DATA LOCAL INFILE "' + path + '" INTO TABLE `' + dbTableName + \
        '`CHARACTER SET utf8 COLUMNS TERMINATED BY "\t" LINES TERMINATED BY ' + lineEnding + ';'
    cursor.execute(sql)
    print(dbTableName + " data added")
    cursor.close()
    connection.close()


# prints the usage statement
def usage():
    print("""Usage: uploadUKBBtoDatabase.py password tablesFolderPath
        password- the MySQL password
        tablesFolderPath- the path to the folder containing the ukbb tables
    """)


def main():
    # the password for connecting to the database
    password = ""
    # the location of the tables
    ukbbTablesFolderPath =  "../tables/"

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
        ukbbTablesFolderPath = setPathWithCheck(argv[2])


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
    tableColumns = "( id int unsigned not null, snp varchar(20), hg38 varchar(50), hg19 varchar(50), hg18 varchar(50), hg17 varchar(50), trait varchar(255), gene varchar(255), raf float, riskAllele varchar(20), pValue double, pValueAnnotation varchar(255), oddsRatio float, lowerCI float, upperCI float, sex varchar(20), citation varchar(50), studyID varchar(20), INDEX (trait, studyID) )"
    createFreshTable(config, "associations_table", "associations_table", tableColumns)
    addDataToTableCatch( config, associationTableFolderPath, "associations_table", "associations_table")

    # add the ukbb_percentiles table to the database
    tableColumns = "( studyID varchar(20), reportedTrait varchar(255), trait varchar(255), citation varchar(50), p0 float, p1 float, p2 float, p3 float, p4 float, p5 float, p6 float, p7 float, p8 float, p9 float, p10 float, p11 float, p12 float, p13 float, p14 float, p15 float, p16 float, p17 float, p18 float, p19 float, p20 float, p21 float, p22 float, p23 float, p24 float, p25 float, p26 float, p27 float, p28 float, p29 float, p30 float, p31 float, p32 float, p33 float, p34 float, p35 float, p36 float, p37 float, p38 float, p39 float, p40 float, p41 float, p42 float, p43 float, p44 float, p45 float, p46 float, p47 float, p48 float, p49 float, p50 float, p51 float, p52 float, p53 float, p54 float, p55 float, p56 float, p57 float, p58 float, p59 float, p60 float, p61 float, p62 float, p63 float, p64 float, p65 float, p66 float, p67 float, p68 float, p69 float, p70 float, p71 float, p72 float, p73 float, p74 float, p75 float, p76 float, p77 float, p78 float, p79 float, p80 float, p81 float, p82 float, p83 float, p84 float, p85 float, p86 float, p87 float, p88 float, p89 float, p90 float, p91 float, p92 float, p93 float, p94 float, p95 float, p96 float, p97 float, p98 float, p99 float, p100 float )"
    createFreshTable(config, "ukbb_raw_percentiles", "ukbb_percentiles", tableColumns)
    addDataToUkbbTableCatch(config, ukbbTablesFolderPath, "ukbb_raw_percentiles", ".tsv", "ukbb_percentiles")

    # add the ukbb_summary_data table to the database
    tableColumns = "( studyID varchar(20), reportedTrait varchar(255), trait varchar(255), citation varchar(50), min float, max float, median float, range float, mean float, geomMean float, harmMean float, stdev float, geomStdev float )"
    createFreshTable(config, "ukbb_raw_summary_data", "ukbb_summary_data", tableColumns)
    addDataToUkbbTableCatch(config, ukbbTablesFolderPath, "ukbb_raw_summary_data", ".tsv", "ukbb_summary_data")

    # TODO figure out how the snps table will be procured -- have to reformat the snps.json file and maybe check against snps in study/trait combo to make sure is accurate. 
    # # add the ukbb_snps table to the database
    # tableColumns = "( studyID varchar(20), snp varchar(20) )"
    # createFreshTable(config, "{name_TBD}", "ukbb_snps", tableColumns)
    # addDataToUkbbTableCatch(config, ukbbTablesFolderPath, "{name_TBD}", ".{ext_TBD}", "ukbb_snps")


    print("Done!")

if __name__ == "__main__":
    main()