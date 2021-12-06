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
def callAllAssociationsEndpoint(refGen, sex):
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
        raise NameError('Table does not exist in database associations_table')
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

    # general file path for writing the files to
    generalFilePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static/downloadables/associationsAndClumpsFiles")

    # creating the trait/studyID to snps file
    returnedAssociations = getTraitStudyToSnp(password)
    formatAndSaveTraitStudyToSnp(returnedAssociations, generalFilePath)

    # we create params for each refGen so that we can run them on multiple processes
    for refGen in ['hg17', 'hg18', 'hg19', 'hg38']:
        paramOpts.append((refGen, password, generalFilePath))

    with Pool(processes=4) as pool:
        pool.map(createServerDownloadFiles, paramOpts)

    print("Finished creating server download association and clumps files")


if __name__ == "__main__":
    main()
