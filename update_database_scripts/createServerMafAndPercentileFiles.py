import os
from os.path import join
from sys import argv
import json
from numpy import percentile
import requests
from multiprocessing import Pool
from uploadTablesToDatabase import checkTableExists, getConnection

# This script creates associations files and clumps files for download to the CLI
#
# How to run: python3 createServerMafAndPercentileFiles.py "password"
# where "password" is the password to the PRSKB database

# This script should be run at least once yearly, after we have updated the maf and cohorts


# gets the percentiles from the database
def getPercentiles(cohort, config):
    connection = getConnection(config)

    print("Getting percentiles for ", cohort)
    percentilesUnformatted = []
    if (checkTableExists(connection.cursor(), "cohort_percentiles")):
        cursor = connection.cursor()
        sql = "SELECT * FROM cohort_percentiles WHERE cohort = '{c}' ;".format(c=cohort)
        cursor.execute(sql)
        returnedClumps = cursor.fetchall()
        cursor.close()
        percentilesUnformatted.extend(returnedClumps)
    else:
        raise NameError('Table does not exist in database: cohort_percentiles')

    return percentilesUnformatted


# create the download file for percentiles
def createPercentileDownloadFile(params):
    cohort = params[0]
    password = params[1]
    generalFilePath = params[2]

    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'auth_plugin': 'mysql_native_password',
    }

    unformattedPercentiles = getPercentiles(cohort, config)
    percentiles = formatPercentiles(unformattedPercentiles)

    percentileFile = open(os.path.join(generalFilePath, "{cohort}_percentiles.txt".format(cohort=cohort)), "w")
    percentileFile.write(json.dumps(percentiles))
    percentileFile.close()

    percentiles = {}

    return


# format the percentiles in the correct way
def formatPercentiles(percentilesUnformatted):
    percentiles = {}
    for line in percentilesUnformatted:
        key = "|".join([line["trait"], line['pValueAnnotation'], line['betaAnnotation'], line['ogValueTypes'], line['studyID']])
        if key not in percentiles:
            percentiles[key] = line #TODO will need to check and see if this works this way

    return percentiles


 # grab MAF data from the database to put into a txt file for download
def getMAF(tablePrefix, config): #, snps):

    connection = getConnection(config)

    mafUnformatted = []
    for i in range(1, 23):
        tableName = tablePrefix + "_chr{i}".format_map(i=i)
        if (checkTableExists(connection.cursor(), tableName)):
            cursor = connection.cursor()
            sql = "SELECT * FROM {table} WHERE snp != 'None'; ".format(tablePrefix) #, snps)
            cursor.execute(sql)
            returnedMaf = cursor.fetchall()
            cursor.close()
            mafUnformatted.extend(returnedMaf)
        else:
            raise NameError('Table does not exist in database: {tablename}'.format(tableName=tableName))

    return mafUnformatted


# format MAF data correctly
def formatMAF(mafUnformatted):
    mafhg17 = {}
    mafhg18 = {}
    mafhg19 = {}
    mafhg38 = {}
    for chrom, hg38, hg19, hg18, hg17, snp, allele, alleleFrequency in mafUnformatted:
        if snp not in mafhg17:
            mafhg17[snp] = {
                "chrom": chrom,
                "pos": hg17,
                "alleles": {}
            }
            mafhg18[snp] = {
                "chrom": chrom,
                "pos": hg18,
                "alleles": {}
            }
            mafhg19[snp] = {
                "chrom": chrom,
                "pos": hg19,
                "alleles": {}
            }
            mafhg38[snp] = {
                "chrom": chrom,
                "pos": hg38,
                "alleles": {}
            }
        mafhg17[snp]['alleles'][allele] = alleleFrequency
        mafhg18[snp]['alleles'][allele] = alleleFrequency
        mafhg19[snp]['alleles'][allele] = alleleFrequency
        mafhg38[snp]['alleles'][allele] = alleleFrequency

    return mafhg17, mafhg18, mafhg19, mafhg38


def createMAFDownloadFiles(params):
    tablePrefix = params[0]
    password = params[1]
    generalFilePath = params[2]

    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'auth_plugin': 'mysql_native_password',
    }

    # This would be a good thing to do, but currently we just filter the snps by whether the have an rsID
    # # get viable snps to pass to the getMAF function
    # # we grab these so that we can make sure we only have maf for snps in our database
    # # connection = getConnection(config)
    # # snps={}
    # # if (checkTableExists(connection.cursor(), "associations_table")):
    # #     cursor = connection.cursor()
    # #     sql = "SELECT DISTINCT snp from associations_table; "
    # #     cursor.execute(sql)
    # #     viableSnps = cursor.fetchall()
    # #     cursor.close()
    # #     for snp in viableSnps:
    # #         snps.add(snp)
    # #     snps = ", ".join(list(snps))

    # # else:
    # #     raise NameError('Table does not exist in database: associations_table')

    # unformattedMaf = getMAF(tablePrefix, config, snps)
    unformattedMaf = getMAF(tablePrefix, config)
    mafhg17, mafhg18, mafhg19, mafhg38 = formatMAF(unformattedMaf)

    hg17 = open(os.path.join(generalFilePath, "{tablePrefix}_hg17.txt".format(tablePrefix=tablePrefix)), "w")
    hg17.write(json.dumps(mafhg17))
    hg17.close()

    mafhg17 = {}

    hg18 = open(os.path.join(generalFilePath, "{tablePrefix}_hg18.txt".format(tablePrefix=tablePrefix)), "w")
    hg18.write(json.dumps(mafhg18))
    hg18.close()

    mafhg18 = {}

    hg19 = open(os.path.join(generalFilePath, "{tablePrefix}_hg19.txt".format(tablePrefix=tablePrefix)), "w")
    hg19.write(json.dumps(mafhg19))
    hg19.close()

    mafhg19 = {}

    hg38 = open(os.path.join(generalFilePath, "{tablePrefix}_hg38.txt".format(tablePrefix=tablePrefix)), "w")
    hg38.write(json.dumps(mafhg38))
    hg38.close()

    mafhg38 = {}

    return


def main():
    password = argv[1]
    paramOpts = []
    paramMAFopts = []

    # general file path for writing the files to
    generalFilePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static/downloadables/preppedServerFiles")

    # we create params for each table prefix so that we can run them on multiple processes
    for tablePrefix in [ "adni_maf", "ukbb_maf", "afr_maf", "amr_maf", "eas_maf", "eur_maf", "sas_maf" ]:
        paramMAFopts.append((tablePrefix, password, generalFilePath))

    with Pool(processes=5) as pool:
        pool.map(createMAFDownloadFiles, paramMAFopts)

    # COMMENTED OUT UNTIL WE ACTUALLY HAVE PERCENTILES TO WORK WITH
    # for cohort in ["adni", 'ukbb', 'afr', 'amr', 'eas', 'eur', 'sas']:
    #     paramOpts.append(cohort, password)
    
    # with Pool(processes=5) as pool2:
    #     pool2.map(createPercentileDownloadFile, paramOpts)

    print("Finished creating server download association and clumps files")


if __name__ == "__main__":
    main()
