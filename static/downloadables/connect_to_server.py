import json
import math
import ast
import requests
import os
import os.path
import time
import datetime

# get the associations and clumps from the Server
def retrieveAssociationsAndClumps(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, superPop, fileHash, extension):
    # Format variables used for getting associations
    traits = traits.split(" ") if traits != "" else None
    if traits is not None:
        traits = [sub.replace('_', ' ') for sub in traits]
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    ethnicity = ethnicity.split(" ") if ethnicity != "" else None
    isPosBased = True if extension.lower() == ".vcf" else False
    
    # TODO still need to test this - can't be done until the new server is live with the new api code
    dnldNewAllAssociFile = checkForAllAssociFile()
    
    workingFilesPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    # if the user didn't give anything to filter by, get all the associations
    if (traits is None and studyTypes is None and studyIDs is None and ethnicity is None):
        # if we need to download a new all associations file, write to file
        if (dnldNewAllAssociFile):
            allAssociationsPath = os.path.join(workingFilesPath, "allAssociations.txt")
            allAssociations = getAllAssociations(pValue, refGen, isPosBased)
            # grab all the snps or positions to use for getting the clumps
            snpsFromAssociations = list(allAssociations.keys())
            f = open(allAssociationsPath, 'w')
            f.write(json.dumps(allAssociations))
            f.close()
        else:
            #TODO check this
            f = open(allAssociationsPath, 'r')
            loadedAssociations = json.loads(f.read())
            f.close()
            snpsFromAssociations = list(loadedAssociations.keys())
            toReturn = ["fileExists"]
    # else get the associations using the given filters
    else:
        fileName = "associations_{ahash}.txt".format(ahash = fileHash)
        specificAssociationsPath = os.path.join(workingFilesPath, fileName)
        specificAssociations = getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, isPosBased)
        
        f = open(specificAssociationsPath, 'w')
        f.write(json.dumps(specificAssociations))
        f.close()
        snpsFromAssociations = list(specificAssociations.keys())
    
    #download clumps
    fileName = "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash)
    clumpsPath = os.path.join(workingFilesPath, fileName)
    # get clumps using the refGen and superpopulation
    clumpsData = getClumps(refGen, superPop, snpsFromAssociations, isPosBased)
    f = open(clumpsPath, 'w')
    f.write(json.dumps(clumpsData))
    f.close()


def checkForAllAssociFile():
    # assume we will need to download new files
    dnldNewAllAssociFile = True
    # check to see if the workingFiles directory is there, if not make the directory
    scriptPath = os.path.dirname(os.path.abspath(__file__))
    workingFilesPath = os.path.join(scriptPath, ".workingFiles")

    # if the directory doesn't exist, make it, and we will need to download the files
    if not os.path.exists(workingFilesPath):
        os.mkdir(workingFilesPath) # need a better name for this?
        return dnldNewAllAssociFile
    
    else:
        # get date the database was last updated
        response = requests.get(url="https://prs.byu.edu/last_database_update")
        response.close()
        assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
        lastDatabaseUpdate = response.text
        lastDatabaseUpdate = lastDatabaseUpdate.split("-")
        lastDBUpdateDate = datetime.date(int(lastDatabaseUpdate[0]), int(lastDatabaseUpdate[1]), int(lastDatabaseUpdate[2]))

        # path to a file containing all the associations from the database
        allAssociationsFile = os.path.join(workingFilesPath, "allAssociations.txt")

        # if the path exists, check if we don't need to download a new one
        if os.path.exists(allAssociationsFile):
            fileModDateObj = time.localtime(os.path.getmtime(allAssociationsFile))
            fileModDate = datetime.date(fileModDateObj.tm_year, fileModDateObj.tm_mon, fileModDateObj.tm_mday)
            # if the file is newer than the database update, we don't need to download a new file
            if (lastDBUpdateDate < fileModDate):
                dnldNewAllAssociFile = False
        
        return dnldNewAllAssociFile


# gets all associations from the Server
def getAllAssociations(pValue, refGen, isPosBased): 
    params = {
        "pValue": pValue,
        "refGen": refGen,
        "isPosBased": isPosBased
    }
    associations = getUrlWithParams("https://prs.byu.edu/all_associations", params = params)
    # Organized with pos/snp as the Keys
    return associations


# gets associations using the given filters
def getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, isPosBased):

    # get the studies matching the parameters
    body = {
        "traits": traits, 
        "studyTypes": studyTypes,
        "ethnicities": ethnicity,
    }
    traitData = {**postUrlWithBody("https://prs.byu.edu/get_studies", body=body)}

    # select the studyIDs of the studies
    finalStudySet = set()
    for trait in traitData:
        for study in traitData[trait]:
            finalStudySet.add(study["studyID"])

    # add the specified studyIDs to the set of studyIDs
    if studyIDs is not None:
        studyIDs = set(studyIDs)
        finalStudySet = finalStudySet.union(studyIDs)

    # get the associations based on the studyIDs
    body = {
        "pValue": pValue,
        "refGen": refGen,
        "studyIDs": list(finalStudySet),
        "isPosBased": isPosBased
    }

    associations = postUrlWithBody("https://prs.byu.edu/get_associations", body=body)
    return associations


# for POST urls
def postUrlWithBody(url, body):
    response = requests.post(url=url, data=body)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json() 


# for GET urls
def getUrlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()  


# get clumps using the refGen and superPop
def getClumps(refGen, superPop, snpsFromAssociations, isPosBased):
    body = {
        "refGen": refGen,
        "superPop": superPop,
    }

    if isPosBased:
        chromToPosMap = {}
        clumps = {}
        for pos in snpsFromAssociations:
            chrom,posit = pos.split(":")
            if (chrom not in chromToPosMap.keys()):
                chromToPosMap[chrom] = [pos]
            else:
                chromToPosMap[chrom].append(pos)

        for chrom in chromToPosMap:
            body['positions'] = chromToPosMap[chrom]
            clumps = {**postUrlWithBody("https://prs.byu.edu/ld_clumping_by_pos", body), **clumps}
    else:
        body['snps'] = snpsFromAssociations
        clumps = postUrlWithBody("https://prs.byu.edu/ld_clumping_by_snp", body)

    return clumps
