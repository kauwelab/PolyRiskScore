import mysql.connector
import os
from os.path import join
from sys import argv
import json
import requests
from multiprocessing import Pool
from uploadTablesToDatabase import checkTableExists, getConnection


def callAllAssociationsEndpoint(refGen, sex):
    params = {
        'pValue': 0,
        'refGen': refGen,
        'sex': sex,
        'isVCF': True
    }
    associations = getUrlWithParams("https://prs.byu.edu/all_associations", params = params)
    return associations


# for GET urls
def getUrlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()  


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


def formatClumps(clumpsUnformatted):
    clumps = {}
    for snp, position, clumpNumber in clumpsUnformatted:
        if snp not in clumps:
            clumps[snp] = {
                'pos': position,
                'clumpNum': clumpNumber
            }

    return clumps


# gets all associations from the Server
def createAssociationsAndClumpsFiles(parmas): 
    refGen = parmas[0]
    password = parmas[1]

    rsIDKeys = set()
    generalFilePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static/downloadables/associationsAndClumpsFiles")

    for sex in ['male', 'female']:
        associationsObj = callAllAssociationsEndpoint(refGen, sex)
        associationsFilePath = os.path.join(generalFilePath, "allAssociations_{refGen}_{sex}.txt".format(refGen=refGen, sex=sex))
        print("Writing Association File:", (refGen, sex))
        rsIDKeys.update(associationsObj['associations'].keys())
        f = open(associationsFilePath, 'w')
        f.write(json.dumps(associationsObj))
        f.close()

    rsIDKeys = ("\"{0}\"".format(x) for x in rsIDKeys if "rs" in x)
    rsIDKeys = ', '.join(rsIDKeys)

    for pop in ["AFR", "AMR", "EAS", "EUR", "SAS"]:
        clumpsFilePath = os.path.join(generalFilePath, "{p}_clumps_{r}.txt".format(p=pop, r=refGen))
        clumpsObjUnformatted = getClumps(refGen, pop, list(rsIDKeys), password)
        clumpsObj = formatClumps(clumpsObjUnformatted)
        print("Writing clumps File:", (refGen, pop))
        f = open(clumpsFilePath, 'w')
        f.write(json.dumps(clumpsObj))
        f.close()

    return


def main():
    password = argv[1]
    paramOpts = []
    for refGen in ['hg17', 'hg18', 'hg19', 'hg38']:
        paramOpts.append((refGen, password))

    with Pool(processes=4) as pool:
        pool.map(createAssociationsAndClumpsFiles, paramOpts)


if __name__ == "__main__":
    main()