import os
from os.path import join
from sys import argv
import json
import requests
from multiprocessing import Pool
from uploadTablesToDatabase import checkTableExists, getConnection

# This script creates associations files and clumps files for download to the CLI
#
# How to run: python3 createServerAssociAndClumpsFiles.py "password"
# where "password" is the password to the PRSKB database

# gets the associationsObj from the all_associations endpoint
def callAllAssociationsEndpoint(refGen):
    params = {
        'pValue': 1,
        'refGen': refGen,
    }
    associations = getUrlWithParams("https://prs.byu.edu/all_associations", params = params)
    return associations


# for GET urls
def getUrlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()  


# gets the clumps from the database
# TODO this will need to be updated for new clumping procedure
def getClumps(refGen, pop, rsIDs, password):
    # set other default variables
    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'auth_plugin': 'mysql_native_password',
    }
    popToColumn = {
        "AFR": "african_Clump",
        "AMR": "american_Clump",
        "EAS": "eastAsian_Clump",
        "EUR": "european_Clump",
        "SAS": "southAsian_Clump"
    }

    connection = getConnection(config)

    print("Getting clumps for ", refGen, pop)
    clumpsUnformatted = []
    for i in range(1, 23):
        if (checkTableExists(connection.cursor(), "{refGen}_chr{i}_clumps".format(refGen=refGen, i=i))):
            cursor = connection.cursor()
            sql = "SELECT snp, position, {superpopclump} AS clumpNumber FROM {refGen}_chr{i}_clumps WHERE snp IN ({snps}); ".format(superpopclump=popToColumn[pop], refGen=refGen, i=i, snps=rsIDs)
            cursor.execute(sql)
            returnedClumps = cursor.fetchall()
            cursor.close()
            clumpsUnformatted.extend(returnedClumps)
        else:
            raise NameError('Table does not exist in database {refGen}_chr{i}_clumps'.format(refGen=refGen, i=i))

    return clumpsUnformatted


# format the clumps in the correct way
def formatClumps(clumpsUnformatted):
    clumps = {}
    for snp, position, clumpNumber in clumpsUnformatted:
        if snp not in clumps:
            clumps[snp] = {
                'pos': position,
                'clumpNum': clumpNumber
            }

    return clumps


    # grab MAF data from the database to put into a txt file for download
def getMAF(tablePrefix, config, snps):

    connection = getConnection(config)

    mafUnformatted = []
    for i in range(1, 23):
        tableName = tablePrefix + "_chr{i}".format_map(i=i)
        if (checkTableExists(connection.cursor(), tableName)):
            cursor = connection.cursor()
            sql = "SELECT * FROM {table} WHERE snp in ${snps}; ".format(tablePrefix, snps)
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


# get the trait/study to snps from the database:
def getTraitStudyToSnp(password):
    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'auth_plugin': 'mysql_native_password',
    }

    connection = getConnection(config)

    print("Getting trait/study to snp")

    if (checkTableExists(connection.cursor(), "associations_table")):
        cursor = connection.cursor()
        sql = "SELECT snp, trait, pValueAnnotation, betaAnnotation, ogValueTypes, studyID FROM associations_table; "
        cursor.execute(sql)
        returnedAssociations = cursor.fetchall()
        cursor.close()
    else:
        raise NameError('Table does not exist in database: associations_table')
    return returnedAssociations


def formatAndSaveTraitStudyToSnp(associLines, generalFilePath):
    formattedTraitStudyToSnps = {}
    for snp, trait, pValueAnnotation, betaAnnotation, ogValueTypes, studyID in associLines:
        key = "|".join([trait, pValueAnnotation, betaAnnotation, ogValueTypes, studyID])
        if (key not in formattedTraitStudyToSnps):
            formattedTraitStudyToSnps[key] = []
        formattedTraitStudyToSnps[key].append(snp)

    traitStudyToSnpPath = os.path.join(generalFilePath, "traitStudyIDToSnps.txt")
    f = open(traitStudyToSnpPath, 'w')
    f.write(json.dumps(formattedTraitStudyToSnps))
    f.close()
    return


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

    # get viable snps to pass to the getMAF function
    # we grab these so that we can make sure we only have maf for snps in our database
    connection = getConnection(config)
    snps={}
    if (checkTableExists(connection.cursor(), "associations_table")):
        cursor = connection.cursor()
        sql = "SELECT DISTINCT snp from associations_table; "
        cursor.execute(sql)
        viableSnps = cursor.fetchall()
        cursor.close()
        for snp in viableSnps:
            snps.add(snp)
        snps = ", ".join(list(snps))

    else:
        raise NameError('Table does not exist in database: associations_table')

    unformattedMaf = getMAF(tablePrefix, config, snps)
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


def createServerDownloadFiles(params): 
    refGen = params[0]
    password = params[1]
    generalFilePath = params[2]

    rsIDKeys = set()

    # creating an AllAssociations file
    associationsObj = callAllAssociationsEndpoint(refGen)
    associationsFilePath = os.path.join(generalFilePath, "allAssociations_{refGen}.txt".format(refGen=refGen))
    print("Writing Association File:", (refGen))
    rsIDKeys.update(associationsObj['associations'].keys())
    f = open(associationsFilePath, 'w')
    f.write(json.dumps(associationsObj))
    f.close()

    #grabing the rsIDs for use in getting the clumps
    rsIDKeys = ("\"{0}\"".format(x) for x in rsIDKeys if "rs" in x)
    rsIDKeys = ', '.join(rsIDKeys)

    # for each superPop in the 1000 genomes, create clumps files for the superPop/refGen combo
    for pop in ["AFR", "AMR", "EAS", "EUR", "SAS"]:
        clumpsFilePath = os.path.join(generalFilePath, "{p}_clumps_{r}.txt".format(p=pop, r=refGen))
        clumpsObjUnformatted = getClumps(refGen, pop, rsIDKeys, password)
        clumpsObj = formatClumps(clumpsObjUnformatted)
        print("Writing clumps File:", (refGen, pop))
        f = open(clumpsFilePath, 'w')
        f.write(json.dumps(clumpsObj))
        f.close()

    return


def main():
    password = argv[1]
    paramOpts = []
    paramMAFopts = []

    # general file path for writing the files to
    generalFilePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static/downloadables/associationsAndClumpsFiles")

    # creating the trait/studyID to snps file
    returnedAssociations = getTraitStudyToSnp(password)
    formatAndSaveTraitStudyToSnp(returnedAssociations, generalFilePath)

    # we create params for each table prefix so that we can run them on multiple processes
    for tablePrefix in [ "adni_maf", "ukbb_maf", "afr_maf", "amr_maf", "eas_maf", "eur_maf", "sas_maf" ]:
        paramMAFopts.append((tablePrefix, password, generalFilePath))

    # we create params for each refGen so that we can run them on multiple processes
    for refGen in ['hg17', 'hg18', 'hg19', 'hg38']:
        paramOpts.append((refGen, password, generalFilePath))

    with Pool(processes=7) as pool:
        pool.map(createMAFDownloadFiles, paramMAFopts)

    with Pool(processes=4) as pool2:
        pool2.map(createServerDownloadFiles, paramOpts)

    print("Finished creating server download association and clumps files")


if __name__ == "__main__":
    main()
