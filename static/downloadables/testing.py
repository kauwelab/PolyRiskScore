import requests
import json

def getAllAssociations(pValue, refGen, traits = None): 
    if (traits is None):
        traits = getAllTraits()
    associations = {}
    url_a = "https://prs.byu.edu/all_associations"
    h=0
    for i in range(100, len(traits), 100):
        params = {
            "traits": traits[h:i],
            "pValue": pValue,
            "refGen": refGen
        }
        response = requests.get(url=url_a, params=params)
        response.close()
        if (response):
            associations = {**associations, **response.json()}
            h = i
        else:
            print(response.status_code)
            break
    else:
        print("Last ones")
        params = {
            "traits": traits[h:len(traits)],
            "pValue": pValue,
            "refGen": refGen
        }
        response = requests.get(url=url_a, params=params)
        response.close()
        associations = {**associations, **response.json()}
    
    snps = "-e #CHROM "
    print(associations)
    for disease in associations:
        for study in associations[disease]:
            print(study)
            for association in associations[disease][study]["associations"]:
                snps += "-e {0} ".format(association['snp'])
    
    associations = "[" + ', '.join(map(str, associations)) + "]"
    print(snps)
    return [snps, associations]

def getSpecificAssociations(pValue, refGen, traits = None, studyTypes = None, studyIDs = None, ethnicity = None):
    traitData = {}
    studyIDspecificData = {}
    url_s = "https://prs.byu.edu/get_studies"

    if (studyIDs is not None):
        url_get_by_study_id = "https://prs.byu.edu/get_studies_by_id"
        params = {
            "ids": studyIDs
        }
        studyIDspecificData = urlWithParams(url_get_by_study_id, params)
        print(studyIDspecificData)

    if traits is None and studyTypes is not None:
        traits = getAllTraits()
        params = {
            "traits": traits,
            "studyTypes": studyTypes
        }
        traitData = {**traitData, **urlWithParams(url_s, params)}
    elif traits is None and studyTypes is None and studyIDs is not None:
        pass
        # we are just going to be working with the studyID studies
    elif traits is not None:
        if studyTypes is None:
            params = {
                "traits": traits,
                "studyTypes": ["HI", "LC", "O"]
            }
        else: 
            params = {
                "traits": traits,
                "studyTypes": studyTypes
            }
        traitData = {**traitData, **urlWithParams(url_s, params)}
    else:
        # I don't think we should ever make it here...
        pass

    if traitData:
        # filter for ethnicity
        finalTraitList = []
        for trait in traitData:
            tmpStudyHolder = []
            for study in traitData[trait]:
                if (ethnicity and ethnicity.lower() in study["ethnicity"].lower() and study["studyID"] not in tmpStudyHolder):
                    tmpStudyHolder.append(study["studyID"])
                    # print(study["ethnicity"])
                elif not ethnicity and study["studyID"] not in tmpStudyHolder:
                    tmpStudyHolder.append(study["studyID"])
            
            traitObj = {
                "trait": trait,
                "studyIDs": tmpStudyHolder
            }
            finalTraitList.append(traitObj)
        print(finalTraitList)

    # if studyIDspecificData:
    #     for obj in studyIDspecificData:
    #         if obj["trait"] in finalTraitList and obj["studyID"] not in finalTraitList[obj["trait"]]:
    #             finalTraitList[obj["trait"]].append(obj["studyID"])
    #         else:
    #             finalTraitList[obj["trait"]] = [obj["studyID"]]

    params_a = {
        "traits": finalTraitList,
        "pValue": pValue,
        "refGen": refGen
    }

    associations = urlWithParams(url="https://prs.byu.edu/get_associations",params=params_a)
    print(associations)


def getAllTraits():
    url_t = "https://prs.byu.edu/get_traits"
    response = requests.get(url=url_t)
    response.close()
    return response.json()

def urlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    print(response.status_code)
    if (response):
        return response.json()
    else:
        return "ERROR" # throw an error
    

# getAllAssociations(0.0000000005, "hg38") #, ["Alzheimer's Disease", "acne"])
getSpecificAssociations(0.00000005, "hg38", ["Alzheimer's Disease", "acne"], ["HI", "LC"], ethnicity="European")
# getSpecificAssociations(0.00000005, "hg38", studyIDs=["GCST004246", "GCST002954"]) # can't test until I update the API

# what I'm thinking currently:
#   if they give us studyIDs -> we grab those no matter what
#   if they give us IDs without anything else, that is ALL we will use to calculate.
#   if they give us studyTypes without traits, we will run on all the traits and give the specified study types
#   if they give us traits without study types, we give all they studyTypes
#   ethnicity is used to filter the results EXCEPT the ones from the studyIDs
#   if they give us just ethnicity, we will run for ALL the studies with that specified ethnicity



