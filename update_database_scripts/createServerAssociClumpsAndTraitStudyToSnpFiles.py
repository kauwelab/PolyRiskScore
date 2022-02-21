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

# This script should be run monthly


def getAssociations(refGen, config):
    connection = getConnection(config)
    associationsUnformatted = []
    if (checkTableExists(connection.cursor(), "associations_table")):
        cursor = connection.cursor()
        sql = "SELECT snp, {r}, riskAllele, pValue, pValueAnnotation, oddsRatio, betaValue, betaUnit, betaAnnotation, ogValueTypes, sex, studyID, trait FROM associations_table; ".format(r=refGen)
        cursor.execute(sql)
        returnedAssociations = cursor.fetchall()
        cursor.close()
        associationsUnformatted = returnedAssociations
    else:
        raise NameError("associations_tables DNE")

    metaDataUnformatted = []
    if (checkTableExists(connection.cursor(), "study_table") and checkTableExists(connection.cursor(), "studyMaxes")):
        cursor = connection.cursor()
        sql = "SELECT studyID, reportedTrait, citation, trait, ethnicity, superPopulation, pValueAnnotation, betaAnnotation, ogValueTypes, sex, " + \
                "IF((SELECT altmetricScore FROM studyMaxes WHERE trait=study_table.trait) = altmetricScore, 'HI', '') as hi, " + \
                "IF((SELECT cohort FROM studyMaxes WHERE trait=study_table.trait) = initialSampleSize+replicationSampleSize, 'LC', '') as lc, " + \
                "IF((SELECT altmetricScore FROM studyMaxes WHERE trait=study_table.reportedTrait) = altmetricScore, 'HI', '') as rthi, " + \
                "IF((SELECT cohort FROM studyMaxes WHERE trait=study_table.reportedTrait) = initialSampleSize+replicationSampleSize, 'LC', '') as rtlc " + \
                "FROM study_table; "
        cursor.execute(sql)
        returnedMetaData = cursor.fetchall()
        cursor.close()
        metaDataUnformatted = returnedMetaData
    else:
        raise NameError("study_table or studyMaxes DNE")

    return formatAssociations(associationsUnformatted, metaDataUnformatted)


def formatAssociations(associationsUnformatted, metaDataUnformatted):
    studyIDsToMetaData = {}
    for studyID, reportedTrait, citation, trait, ethnicity, superPopulation, pValueAnnotation, betaAnnotation, ogValueTypes, sex, hi, lc, rthi, rtlc in metaDataUnformatted:
        traitStudyTypes = []
        if (hi != ""):
            traitStudyTypes.append(hi)
        if (lc != ""):
            traitStudyTypes.append(lc)
        if len(traitStudyTypes) == 0:
            traitStudyTypes.append("O")

        ethnicities = ethnicity.replace(" or ", "|").split("|")
        pvalBetaAnnoValType = "|".join([pValueAnnotation, betaAnnotation, ogValueTypes])
        superPopulations = superPopulation.split("|")
        if (not (studyID in studyIDsToMetaData)):
            studyTypes = []
            if rthi != "":
                studyTypes.append(rthi)
            if rtlc != "":
                studyTypes.append(rtlc)
            if len(studyTypes) == 0 :
                studyTypes.append("O")
            studyIDsToMetaData[studyID] = {
                    "citation": citation,
                    "reportedTrait": reportedTrait,
                    "studyTypes": studyTypes,
                    "traits": {},
                    "ethnicity": ethnicities if ethnicities != "" else []
            }
    
        if not (trait in studyIDsToMetaData[studyID]["traits"]):
            studyIDsToMetaData[studyID]["traits"][trait] = {
                    "studyTypes": traitStudyTypes,
                    "pValBetaAnnoValType": [pvalBetaAnnoValType],
                    "superPopulations": superPopulations,
                    "sexes": [sex]
            }
        else:
            studyIDsToMetaData[studyID]["traits"][trait]["studyTypes"] = list(set(studyIDsToMetaData[studyID]["traits"][trait]["studyTypes"] + traitStudyTypes))
            studyIDsToMetaData[studyID]["traits"][trait]["pValBetaAnnoValType"].append(pvalBetaAnnoValType) 
            studyIDsToMetaData[studyID]["traits"][trait]["superPopulations"] = list(set(studyIDsToMetaData[studyID]["traits"][trait]["superPopulations"] + superPopulations))
            studyIDsToMetaData[studyID]["traits"][trait]["sexes"].append(sex)
    associationsBySnp = {}

    for snp, position, riskAllele, pValue, pValueAnnotation, oddsRatio, betaValue, betaUnit, betaAnnotation, ogValueTypes, sex, studyID, trait in associationsUnformatted:
        if studyID in studyIDsToMetaData:
            if not snp in associationsBySnp:
                associationsBySnp[position] = snp
                associationsBySnp[snp] = {
                        "pos": position,
                        "traits": {}
                    }

            if not trait in associationsBySnp[snp]["traits"]:
                associationsBySnp[snp]["traits"][trait] = {}
            if not studyID in associationsBySnp[snp]["traits"][trait]:
                associationsBySnp[snp]["traits"][trait][studyID] = {}
            pValBetaAnnoValType = pValueAnnotation + "|" + betaAnnotation + "|" + ogValueTypes
            if not pValBetaAnnoValType in associationsBySnp[snp]["traits"][trait][studyID]:
                associationsBySnp[snp]["traits"][trait][studyID][pValBetaAnnoValType] = {
                        "riskAllele": riskAllele,
                        "pValue": pValue,
                        "oddsRatio": oddsRatio,
                        "betaValue": betaValue,
                        "betaUnit": betaUnit,
                        "sex": sex,
                        "ogValueTypes": ogValueTypes
                    }
            else:
                print("we have a duplicate or a serious problem..")
                print(studyID, trait, pValBetaAnnoValType, snp, riskAllele, associationsBySnp[snp]["traits"][trait][studyID][pValBetaAnnoValType])
        else:
            print("Not in studyIDsToMetaData", studyID)

    return { "studyIDsToMetaData": studyIDsToMetaData, "associations": associationsBySnp }


# gets the clumps from the database
# TODO this will need to be updated for new clumping procedure
def getClumps(refGen, pop, rsIDs, config):
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


def createServerDownloadFiles(params): 
    refGen = params[0]
    password = params[1]
    generalFilePath = params[2]
    config = {
        'user': 'polyscore',
        'password': password,
        'host': 'localhost',
        'database': 'polyscore',
        'auth_plugin': 'mysql_native_password',
    }

    rsIDKeys = set()

    # creating an AllAssociations file
    # associationsObj = callAllAssociationsEndpoint(refGen)
    associationsObj = getAssociations(refGen, config)
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
        clumpsObjUnformatted = getClumps(refGen, pop, rsIDKeys, config)
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
    generalFilePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../static/downloadables/preppedServerFiles")

    # creating the trait/studyID to snps file
    returnedAssociations = getTraitStudyToSnp(password)
    formatAndSaveTraitStudyToSnp(returnedAssociations, generalFilePath)

    # we create params for each refGen so that we can run them on multiple processes
    for refGen in ['hg17', 'hg18', 'hg19', 'hg38']:
        paramOpts.append((refGen, password, generalFilePath))

    with Pool(processes=4) as pool2:
        pool2.map(createServerDownloadFiles, paramOpts)

    print("Finished creating server download association and clumps files")


if __name__ == "__main__":
    main()
