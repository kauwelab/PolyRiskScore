import os
from os.path import join
from sys import argv
import json
from numpy import percentile
import requests
from multiprocessing import Pool
from uploadTablesToDatabase import checkTableExists, getConnection
import sys

# This script creates associations files and clumps files for download to the CLI
#
# How to run: python3 createServerMafAndPercentileFiles.py "password"
# where "password" is the password to the PRSKB database

# This script should be run monthly as well


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

    percentileFile = open(os.path.join(generalFilePath, "allPercentiles_{cohort}.txt".format(cohort=cohort)), "w")
    percentileFile.write(json.dumps(percentiles))
    percentileFile.close()

    percentiles = {}

    return


# format the percentiles in the correct way
def formatPercentiles(percentilesUnformatted):
    percentiles = {}
    for line in percentilesUnformatted:
        key = "|".join([line[2], line[4], line[5], line[6], line[0]])
        if key not in percentiles:
            percentiles[key] = {
                "studyID": line[0],
                "reportedTrait": line[1],
                "trait": line[2],
                "citation": line[3],
                "pValueAnnotation": line[4],
                "betaAnnotation": line[5],
                "ogValueTypes": line[6],
                "betaUnit": line[7],
                "snpOverlap": line[8],
                "totalSnps": line[9],
                "usedSuperPop": line[10],
                "p0": line[11],
                "p1": line[12],
                "p2": line[13],
                "p3": line[14],
                "p4": line[15],
                "p5": line[16],
                "p6": line[17],
                "p7": line[18],
                "p8": line[19],
                "p9": line[20],
                "p10": line[21],
                "p11": line[22],
                "p12": line[23],
                "p13": line[24],
                "p14": line[25],
                "p15": line[26],
                "p16": line[27],
                "p17": line[28],
                "p18": line[29],
                "p19": line[30],
                "p20": line[31],
                "p21": line[32],
                "p22": line[33],
                "p23": line[34],
                "p24": line[35],
                "p25": line[36],
                "p26": line[37],
                "p27": line[38],
                "p28": line[39],
                "p29": line[40],
                "p30": line[41],
                "p31": line[42],
                "p32": line[43],
                "p33": line[44],
                "p34": line[45],
                "p35": line[46],
                "p36": line[47],
                "p37": line[48],
                "p38": line[49],
                "p39": line[50],
                "p40": line[51],
                "p41": line[52],
                "p42": line[53],
                "p43": line[54],
                "p44": line[55],
                "p45": line[56],
                "p46": line[57],
                "p47": line[58],
                "p48": line[59],
                "p49": line[60],
                "p50": line[61],
                "p51": line[62],
                "p52": line[63],
                "p53": line[64],
                "p54": line[65],
                "p55": line[66],
                "p56": line[67],
                "p57": line[68],
                "p58": line[69],
                "p59": line[70],
                "p60": line[71],
                "p61": line[72],
                "p62": line[73],
                "p63": line[74],
                "p64": line[75],
                "p65": line[76],
                "p66": line[77],
                "p67": line[78],
                "p68": line[79],
                "p69": line[80],
                "p70": line[81],
                "p71": line[82],
                "p72": line[83],
                "p73": line[84],
                "p74": line[85],
                "p75": line[85],
                "p76": line[86],
                "p77": line[87],
                "p78": line[88],
                "p79": line[89],
                "p80": line[90],
                "p81": line[91],
                "p82": line[92],
                "p83": line[93],
                "p84": line[94],
                "p85": line[95],
                "p86": line[96],
                "p87": line[97],
                "p88": line[98],
                "p89": line[99],
                "p90": line[100],
                "p91": line[101],
                "p92": line[102],
                "p93": line[103],
                "p94": line[104],
                "p95": line[105],
                "p96": line[106],
                "p97": line[107],
                "p98": line[108],
                "p99": line[109],
                "p100": line[110],
                "cohort": line[111]
            }

    return percentiles


# grab MAF data from the database to put into a txt file for download
def getMAF(tablePrefix, config, generalFilePath):
    hg17 = open(os.path.join(generalFilePath, "{tablePrefix}_hg17.txt".format(tablePrefix=tablePrefix)), "w")
    hg18 = open(os.path.join(generalFilePath, "{tablePrefix}_hg18.txt".format(tablePrefix=tablePrefix)), "w")
    hg19 = open(os.path.join(generalFilePath, "{tablePrefix}_hg19.txt".format(tablePrefix=tablePrefix)), "w")
    hg38 = open(os.path.join(generalFilePath, "{tablePrefix}_hg38.txt".format(tablePrefix=tablePrefix)), "w")
    hg17.write("{ ")
    hg18.write("{ ")
    hg19.write("{ ")
    hg38.write("{ ")
    mafUnformatted = []
    connection = getConnection(config)
    try:
        for i in range(1, 23):
            tableName = tablePrefix + "_chr{i}".format(i=i)
            print(f'on {tableName}')
            if (checkTableExists(connection.cursor(), tableName)):
                cursor = connection.cursor()
                sql = "SELECT {0}.chrom, {0}.hg38, {0}.hg19, {0}.hg18, {0}.hg17, {0}.snp, {0}.allele, {0}.alleleFrequency FROM {0} INNER JOIN associations_table ON {0}.snp=associations_table.snp ORDER BY snp; ".format(tableName)
                cursor.execute(sql)
                returnedMaf = cursor.fetchall()
                #mafUnformatted.extend(returnedMaf)
                cursor.close()
                mafhg17, mafhg18, mafhg19, mafhg38 = formatMAF(i,returnedMaf, hg17, hg18, hg19, hg38)
                if i < 22:
                    hg17.write(", ")
                    hg18.write(", ")
                    hg19.write(", ")
                    hg38.write(", ")

            else:
                raise NameError('Table does not exist in database: {tablename}'.format(tablename=tableName))
    except:
        print(sys.exc_info()[1])
    #mafhg17, mafhg18, mafhg19, mafhg38 = formatMAF(mafUnformatted)
    hg17.write(" }")
    hg17.close()
    hg18.write(" }")
    hg18.close()
    hg19.write(" }")
    hg19.close()
    hg38.write(" }")
    hg38.close()
    return mafUnformatted


# format MAF data correctly
def formatMAF(i, mafUnformatted, hg17_file, hg18_file, hg19_file, hg38_file):
    mafhg17 = {}
    mafhg18 = {}
    mafhg19 = {}
    mafhg38 = {}
    oldSnp = ""
    linesToWriteHg17 = []
    linesToWriteHg18 = []
    linesToWriteHg19 = []
    linesToWriteHg38 = []
    
    for chrom, hg38, hg19, hg18, hg17, snp, allele, alleleFrequency in mafUnformatted:
        if oldSnp != "" and oldSnp != snp:
            linesToWriteHg17.append(f'"{oldSnp}": {json.dumps(mafhg17[oldSnp])}')
            linesToWriteHg18.append(f'"{oldSnp}": {json.dumps(mafhg18[oldSnp])}')
            linesToWriteHg19.append(f'"{oldSnp}": {json.dumps(mafhg19[oldSnp])}')
            linesToWriteHg38.append(f'"{oldSnp}": {json.dumps(mafhg38[oldSnp])}')
            mafhg17 = {}
            mafhg18 = {}
            mafhg19 = {}
            mafhg38 = {}
            oldSnp = snp
        elif oldSnp == "":
            oldSnp = snp

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

    hg17_file.write(", ".join(linesToWriteHg17))
    hg18_file.write(", ".join(linesToWriteHg18))
    hg19_file.write(", ".join(linesToWriteHg19))
    hg38_file.write(", ".join(linesToWriteHg38))

    return mafhg17, mafhg18, mafhg19, mafhg38


def createMAFDownloadFiles(params):
    tablePrefix = params[0]
    password = params[1]
    generalFilePath = params[2]

    print(f'On {tablePrefix}')

    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'auth_plugin': 'mysql_native_password',
    }

    getMAF(tablePrefix, config, generalFilePath)

    return


def main():
    password = argv[1]
    paramOpts = []
    paramMAFopts = []

    # general file path for writing the files to
    generalFilePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static/downloadables/preppedServerFiles")
    print("Starting to get MAF and Percentile data to create files")

    # we create params for each table prefix so that we can run them on multiple processes
    for tablePrefix in [ "adni_maf", "ukbb_maf", "afr_maf", "amr_maf", "eas_maf", "eur_maf", "sas_maf" ]:
         paramMAFopts.append((tablePrefix, password, generalFilePath))
        #createMAFDownloadFiles([tablePrefix, password, generalFilePath])

   # with Pool(processes=7) as pool:
    #    pool.map(createMAFDownloadFiles, paramMAFopts)

    # COMMENTED OUT UNTIL WE ACTUALLY HAVE PERCENTILES TO WORK WITH
    for cohort in ["adni_ad", 'adni_controls', 'adni_mci', 'afr', 'amr', 'eas', 'eur', 'sas']: #'ukbb'
         paramOpts.append((cohort, password, generalFilePath))
    
    with Pool(processes=5) as pool2:
         pool2.map(createPercentileDownloadFile, paramOpts)

    print("Finished creating server download percentile and maf files")


if __name__ == "__main__":
    main()
