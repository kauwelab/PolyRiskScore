import requests
import json

def getAllAssociations(pValue, refGen, traits = None): 
    if (traits is None):
        traits = getAllTraits()

    associations = getAssociations("https://prs.byu.edu/all_associations", traits, pValue, refGen)
    return formatAssociationsForReturn(associations)

def getSpecificAssociations(pValue, refGen, traits = None, studyTypes = None, studyIDs = None, ethnicity = None):
    studyIDspecificData = {}

    if (studyIDs is not None):
        url_get_by_study_id = "https://prs.byu.edu/get_studies_by_id"
        params = {
            "ids": studyIDs
        }
        studyIDspecificData = urlWithParams(url_get_by_study_id, params)

    if traits is None and studyTypes is not None:
        traits = getAllTraits()
    elif traits is not None:
        if studyTypes is None:
            studyTypes = ["HI", "LC", "O"]

    if traits is not None and studyTypes is not None:
        params = {
            "traits": traits, 
            "studyTypes": studyTypes
        }
        traitData = {**urlWithParams("https://prs.byu.edu/get_studies", params)}

    if traitData:
        # filter for ethnicity
        finalTraitList = []
        for trait in traitData:
            tmpStudyHolder = []
            for study in traitData[trait]:
                if (ethnicity and ethnicity.lower() in study["ethnicity"].lower() and study["studyID"] not in tmpStudyHolder):
                    tmpStudyHolder.append(study["studyID"])
                elif not ethnicity and study["studyID"] not in tmpStudyHolder:
                    tmpStudyHolder.append(study["studyID"])
            
            traitObj = {
                "trait": trait,
                "studyIDs": tmpStudyHolder
            }
            finalTraitList.append(traitObj)

    if studyIDspecificData:
        for obj in studyIDspecificData:
            if obj["trait"] in finalTraitList and obj["studyID"] not in finalTraitList[obj["trait"]]:
                finalTraitList[obj["trait"]].append(obj["studyID"])
            else:
                finalTraitList[obj["trait"]] = [obj["studyID"]]

    associations = getAssociations("https://prs.byu.edu/get_associations", finalTraitList, pValue, refGen, 1)
    return formatAssociationsForReturn(associations)

def getAssociations(url, traits, pValue, refGen, turnString = None):
    associations = {}
    h=0
    for i in range(100, len(traits), 100):
        params = {
            "traits": json.dumps(traits[h:i]) if turnString else traits[h:i],
            "pValue": pValue,
            "refGen": refGen
        }
        associations = {**associations, **urlWithParams(url, params)}
        h = i
    else:
        params = {
            "traits": json.dumps(traits[h:len(traits)]) if turnString else traits[h:len(traits)],
            "pValue": pValue,
            "refGen": refGen
        }
        associations = {**associations, **urlWithParams(url, params)}
    return associations

def formatAssociationsForReturn(associations):
    snps = "-e #CHROM "
    for disease in associations:
        for study in associations[disease]:
            for association in associations[disease][study]["associations"]:
                snps += "-e {0} ".format(association['pos'])

    associations = "[" + ', '.join(map(str, associations)) + "]"
    return (snps, associations)

def getAllTraits():
    url_t = "https://prs.byu.edu/get_traits"
    response = requests.get(url=url_t)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()

def urlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()    

# getAllAssociations(0.0000000005, "hg38") #, ["Alzheimer's Disease", "acne"])
getSpecificAssociations(0.5, "hg38", ["Alzheimer's Disease", "acne"], ["HI", "LC"], ethnicity="European")
# getSpecificAssociations(0.00000005, "hg38", studyIDs=["GCST004246", "GCST002954"]) # can't test until I update the API

# what I'm thinking currently:
#   if they give us studyIDs -> we grab those no matter what
#   if they give us IDs without anything else, that is ALL we will use to calculate.
#   if they give us studyTypes without traits, we will run on all the traits and give the specified study types
#   if they give us traits without study types, we give all they studyTypes
#   ethnicity is used to filter the results EXCEPT the ones from the studyIDs
#   if they give us just ethnicity, we will run for ALL the studies with that specified ethnicity



