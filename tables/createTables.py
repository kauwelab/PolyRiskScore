#!/usr/bin/python
# -*- coding: utf-8 -*-
 
import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
import os
from os import listdir
from os.path import isfile, join
from sys import argv
 
import datetime, time

def getConnection(config):
    try:
        connection = mysql.connector.connect(**config)
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

def checkTableExists(connection, tableName):
    cursor = connection.cursor()
    cursor.execute("""
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_name = '{0}'
        """.format(tableName.replace('\'', '\'\'')))
    if cursor.fetchone()[0] == 1:
        cursor.close()
        return True

    cursor.close()
    return False

def deleteTable(connection, tableName):
    cursor = connection.cursor()
    sql = "DROP TABLE " + tableName + ";"
    cursor.execute(sql)
    cursor.close()

def createTable(connection, tableName):
    cursor = connection.cursor()
    tableColumns =" ( id smallint unsigned not null, snp varchar(20), hg38 varchar(50), hg19 varchar(50), hg18 varchar(50), hg17 varchar(50), gene varchar(50), ethnicity varchar(100), raf float, riskAllele varchar(20), pValue double, oddsRatio float, lowerCI float, upperCI float, seLnOR double, study varchar(50), cohort double, citations double )';"
    sql = "SET @query = 'CREATE TABLE " + tableName + tableColumns + "PREPARE stmt FROM @query;" + "EXECUTE stmt;" + "DEALLOCATE PREPARE stmt;"
    cursor.execute(sql, multi = True)
    cursor.close()

#removes the table in fileNames if it exists and creates a new table
def createFreshTable(config, tableName):
    connection = getConnection(config)
    dropped = False
    # drop the table if it already exists
    if checkTableExists(connection, tableName):
        deleteTable(connection, tableName)
        dropped = True
    #create a new table with the table columns specified
    createTable(connection, tableName)
    if dropped:
        print(tableName + " recreated")
    else:
        print(tableName + " created")

def addDataToTable(config, tableName):
    connection = getConnection(config)
    cursor = connection.cursor()
    workingDirectoryPath = os.getcwd().replace("\\", "/") + "/"
    sql = "LOAD DATA LOCAL INFILE '" + workingDirectoryPath + tableName + ".csv' INTO TABLE " + tableName + " COLUMNS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 LINES;"            
    cursor.execute(sql, multi = True)
    cursor.close()
    print(tableName + " data added")

def getAllExistingTables(config):
    connection = getConnection(config)
    cursor = connection.cursor()
    cursor.execute("SHOW tables")
    existingTableNames = []
    for (table_name,) in cursor:
        existingTableNames.append(table_name)
    return existingTableNames

def enableLocalLoad(config):
    connection = getConnection(config)
    cursor = connection.cursor()
    sql = "SET GLOBAL local_infile = 1;"
    cursor.execute(sql)
    cursor.close()
    connection.close()

def usage():
    print("""Usage: password cleanDatabaseBoolean commaSeparatedTableString
    password- the MySQL password
    cleanDatabaseBoolean- optional boolean- if true or t, removes all non updated tables from the DB
    commaSeparatedTableString- optional list of table names to update, separated by a comma and a space (ex: "ad, als")
    """)

def main():
    config = {}
    if len(argv) > 1:
        config = {
            'user': 'polyscore',
            'password': argv[1],
            'host': 'localhost',
            'database': 'polyscore',
            'allow_local_infile': True,
            'auth_plugin': 'mysql_native_password',
            #'raise_on_warnings': True,
        }
    else:
        print("Password is required!")
        usage()
        exit()

    tablesToUpdate = []
    if len(argv) > 2:
        if argv[2].lower() == "true" or argv[2].lower() == "t":
            existingTables = getAllExistingTables(config)
            for tableName in tablesToUpdate:
                if tableName in existingTables:
                    existingTables.remove(tableName)
            print("You are about to remove the following tables from the database " + str(existingTables))
            if input("Are you sure? (y/n)") != "y":
                print("Aborted by user.")
                exit()
            else:
                print('Cleaning the database')
                for tableName in existingTables:
                    connection = getConnection(config)
                    deleteTable(connection, tableName)
                    connection.close()
                    print(tableName + " removed")
    if len(argv) > 3:
        tablesToUpdate = argv[3].split(', ') 
        print("Updating tables: " + str(tablesToUpdate))
    else:
        mypath = os.getcwd()
        tablesToUpdate = [f[:-4] for f in listdir(mypath) if f[-4:] == ".csv"]
        print("Using default tables found in the current working directory.")
                

    #before adding data, sets a parameter so data can be loaded from local files
    enableLocalLoad(config)

    #for each table, create a fresh table and add the data in the current directory with that table name to it
    for tableName in tablesToUpdate:
        createFreshTable(config, tableName)
        addDataToTable(config, tableName)
    
if __name__ == "__main__":
    main()
