import json
import math
import ast
import requests
import time
import datetime

# get the associations and clumps from the Server
def retrieveAssociationsAndClumps(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, superPop):
    # Format variables used for getting associations
    traits = traits.split(" ") if traits != "" else None
    if traits is not None:
        traits = [sub.replace('_', ' ') for sub in traits]
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    ethnicity = ethnicity.split(" ") if ethnicity != "" else None

    # if the user didn't give anything to filter by, get all the associations
    if (traits is None and studyTypes is None and studyIDs is None and ethnicity is None):
        toReturn = getAllAssociations(pValue, refGen)
    # else get the associations using the given filters
    else:
        toReturn = getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity)
    
    # get clumps using the refGen and superpopulation
    toReturn.append(getClumps(refGen, superPop))
    
    print('%'.join(toReturn))


# gets all associations from the Server
def getAllAssociations(pValue, refGen): 
    params = {
        "pValue": pValue,
        "refGen": refGen
    }
    associations = getUrlWithParams("https://prs.byu.edu/all_associations", params = params)
    # Organized with studyIDs as the Keys
    return json.dumps(associations)


# gets associations using the given filters
def getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity):

    # get the studies matching the parameters
    body = {
        "traits": traits, 
        "studyTypes": studyTypes,
        "ethnicities": ethnicity
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
        "studyIDs": list(finalStudySet)
    }

    associations = postUrlWithBody("https://prs.byu.edu/get_associations", body=body)
    return json.dumps(associations)


# for POST urls
def postUrlWithBody(url, body):
    #TODO still need to test this
    response = requests.post(url=url, body=body)
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
def getClumps(refGen, superPop):
    params = {
        "refGen": refGen,
        "superPop": superPop
    }

    clumps = getUrlWithParams("https://prs.byu.edu/ld_clumping", params)
    return json.dumps(clumps)
