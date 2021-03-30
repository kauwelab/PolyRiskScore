import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import sys


# $1 = database password
# $2 = intended database table name (e.g. hg19_chr1_clumps)
# $3 = path to CSV file (the one that will be uploaded to the database table)

def enableLocalFile(cursor):
    sql = "SET GLOBAL local_infile = 1;"
    cursor.execute(sql)
    cursor.close()

def getConnection():
    config = {
            'user': 'polyscore',
            'password': sys.argv[1],
            'host': 'localhost',
            'database': 'polyscore',
            'allow_local_infile': True,
            'auth_plugin': 'mysql_native_password',
    }
    try:
        connection = mysql.connector.connect(**config)
        connection.autocommit = True
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Something is wrong with your user name or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
        else:
            print("other error")
            print(err)
    else:
        print("in connection")
    
    mycursor = connection.cursor()
    print("made connection and got cursor")
    return connection, mycursor

        

def main():
    # Get connection
    connection, mycursor = getConnection()
    table_name = str(sys.argv[2])
    filePath = str(sys.argv[3])

    # Create table with input parameter as table name
    sql ="CREATE TABLE {}_clumps(snp VARCHAR(900), position VARCHAR(900), african_clump INT, american_clump INT, eastAsian_clump INT, european_clump INT, southAsian_clump INT)".format(table_name)
    mycursor.execute(sql)
    print("created table")

    enableLocalFile(mycursor)
    connection.close()

    

    connection, mycursor = getConnection()
    
        
    query = "LOAD DATA LOCAL INFILE '{}' INTO TABLE {} FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' (snp, position, african_clump, american_clump, eastAsian_clump, european_clump, southAsian_clump)".format(filePath, table_name)

    mycursor.execute(query)
    
    connection.commit()
    mycursor.close()
    connection.close()

main()
