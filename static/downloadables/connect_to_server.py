import json
import math
import ast
import requests
import os
import os.path
import time
import datetime
from multiprocessing import Process

# get the associations and clumps from the Server
def retrieveAssociationsAndClumps(refGen, traits, studyTypes, studyIDs, ethnicity, superPop, fileHash, extension, defaultSex):
    checkInternetConnection()

    # Format variables used for getting associations
    traits = traits.split(" ") if traits != "" else None
    if traits is not None:
        traits = [sub.replace('_', ' ') for sub in traits]
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    ethnicity = ethnicity.split(" ") if ethnicity != "" else None

    dnldNewAllAssociFile = checkForAllAssociFile(refGen, defaultSex)
    
    workingFilesPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    associationsPath = ""
    # if the user didn't give anything to filter by, get all the associations
    if (traits is None and studyTypes is None and studyIDs is None and ethnicity is None):
        # if we need to download a new all associations file, write to file
        associationsPath = os.path.join(workingFilesPath, "allAssociations_{refGen}_{sex}.txt".format(refGen=refGen, sex=defaultSex[0]))
        if (dnldNewAllAssociFile):
            associationsReturnObj = getAllAssociations(refGen, defaultSex)
            strandFlip = True
            downloadClumpsFile = True
        else:
            # TODO: on a later branch, create an endpoint to check the date of the clumps file with the date of the clumps files on the database
            downloadClumpsFile = True
            strandFlip = False
            # if os.path.exists(os.path.join(workingFilesPath, "{p}_clumps_{r}.txt".format(p=superPop, r=refGen))):
            #     # check the date on the file/ server file? 
            #     return
            # else:
            #     downloadClumpsFile = True
            #     strandFlip = False
    # else get the associations using the given filters
    else:
        fileName = "associations_{ahash}.txt".format(ahash = fileHash)
        associationsPath = os.path.join(workingFilesPath, fileName)
        associationsReturnObj = getSpecificAssociations(refGen, traits, studyTypes, studyIDs, ethnicity, defaultSex)
        strandFlip = True
        downloadClumpsFile = False

    # flip strands as needed
    if strandFlip:
        print("Starting strand flipping on additional process")
        p = Process(target=handleStrandFlippingAndSave, args=(associationsReturnObj, associationsPath))
        p.start()

    if downloadClumpsFile:
        clumpsPath = os.path.join(workingFilesPath, "{p}_clumps_{r}.txt".format(p=superPop, r=refGen))
        clumpsData = getAllClumps(refGen, superPop)
    else:
        # grab all the snps or positions to use for getting the clumps
        snpsFromAssociations = list(associationsReturnObj['associations'].keys())
        
        #download clumps from database
        fileName = "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash)
        clumpsPath = os.path.join(workingFilesPath, fileName)
        # get clumps using the refGen and superpopulation
        clumpsData = getClumps(refGen, superPop, snpsFromAssociations)

    f = open(clumpsPath, 'w', encoding="utf-8")
    f.write(json.dumps(clumpsData))
    f.close()

    if strandFlip:
        p.join()
    return


def checkForAllAssociFile(refGen, defaultSex):
    # assume we will need to download new files
    dnldNewAllAssociFile = True
    # check to see if the workingFiles directory is there, if not make the directory
    scriptPath = os.path.dirname(os.path.abspath(__file__))
    workingFilesPath = os.path.join(scriptPath, ".workingFiles")

    # if the directory doesn't exist, make it, and we will need to download the files
    if not os.path.exists(workingFilesPath):
        os.mkdir(workingFilesPath)
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
        allAssociationsFile = os.path.join(workingFilesPath, "allAssociations_{refGen}_{sex}.txt".format(refGen=refGen, sex=defaultSex[0]))

        # if the path exists, check if we don't need to download a new one
        if os.path.exists(allAssociationsFile):
            fileModDateObj = time.localtime(os.path.getmtime(allAssociationsFile))
            fileModDate = datetime.date(fileModDateObj.tm_year, fileModDateObj.tm_mon, fileModDateObj.tm_mday)
            # if the file is newer than the database update, we don't need to download a new file
            if (lastDBUpdateDate < fileModDate):
                dnldNewAllAssociFile = False
        
        return dnldNewAllAssociFile


# gets associations obj download from the Server
def getAllAssociations(refGen, defaultSex): 
    params = {
        "refGen": refGen,
        "defaultSex": defaultSex[0],
    }
    associationsReturnObj = getUrlWithParams("https://prs.byu.edu/get_associations_download_file", params = params)
    # Organized with pos/snp as the Keys
    return associationsReturnObj


# gets the clumps file download from the server
def getAllClumps(refGen, superPop):
    params = {
        'refGen': refGen,
        'superPop': superPop
    }
    clumpsReturnObj = getUrlWithParams("https://prs.byu.edu/get_clumps_download_file", params=params)
    return clumpsReturnObj


# gets associationReturnObj using the given filters
def getSpecificAssociations(refGen, traits, studyTypes, studyIDs, ethnicity, defaultSex):
    finalStudyList = []

    if (traits is not None or studyTypes is not None or ethnicity is not None):
        # get the studies matching the parameters
        body = {
            "traits": traits, 
            "studyTypes": studyTypes,
            "ethnicities": ethnicity,
        }
        traitData = {**postUrlWithBody("https://prs.byu.edu/get_studies", body=body)}

        # select the studyIDs of the studies
        for trait in traitData:
            for study in traitData[trait]:
                # if the studyID is in the studyIDs list, don't add it in here
                if (studyIDs is not None and study['studyID'] in studyIDs):
                    continue
                else:
                    finalStudyList.append(json.dumps({
                        "trait": trait,
                        "studyID": study['studyID']
                    }))

    # get the data for the specified studyIDs
    if (studyIDs is not None):
        params = {
            "studyIDs": studyIDs
        }
        studyIDDataList = getUrlWithParams("https://prs.byu.edu/get_studies_by_id", params = params)
        if studyIDDataList == []:
            print('\n\nWARNING, NO STUDIES MATCHED THE GIVEN STUDY ID(S): {}. \nTHIS MAY CAUSE THE PROGRAM TO QUIT IF THERE WERE NO OTHER FILTERS.\n'.format(studyIDs))

        for i in range(len(studyIDDataList)):
            # add the specified studyIDs to the set of studyIDObjs
            finalStudyList.append(json.dumps({
                "trait": studyIDDataList[i]['trait'],
                "studyID": studyIDDataList[i]['studyID']
            }))

    # get the associations based on the studyIDs
    body = {
        "refGen": refGen,
        "studyIDObjs": finalStudyList,
        "sex": defaultSex,
    }

    if finalStudyList == []:
        raise SystemExit("\n\n!!!NONE OF THE STUDIES IN THE DATABASE MATCH THE SPECIFIED FILTERS!!!")

    associationsReturnObj = postUrlWithBody("https://prs.byu.edu/get_associations", body=body)
    return associationsReturnObj


# for POST urls
def postUrlWithBody(url, body):
    response = requests.post(url=url, data=body)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    if response.status_code == 204:
        return {}
    return response.json() 


# for GET urls
def getUrlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()  


# get clumps using the refGen and superPop
def getClumps(refGen, superPop, snpsFromAssociations):
    body = {
        "refGen": refGen,
        "superPop": superPop,
    }
    print("Retrieving clumping information")

    try:
        chromToPosMap = {}
        clumps = {}
        for pos in snpsFromAssociations:
            if (len(pos.split(":")) > 1):
                chrom,posit = pos.split(":")
                if (chrom not in chromToPosMap.keys()):
                    chromToPosMap[chrom] = [pos]
                else:
                    chromToPosMap[chrom].append(pos)

        print("Clumps downloaded by chromosome:")
        for chrom in chromToPosMap:
            print("{0}...".format(chrom), end="", flush=True)
            body['positions'] = chromToPosMap[chrom]
            clumps = {**postUrlWithBody("https://prs.byu.edu/ld_clumping_by_pos", body), **clumps}
        print('\n')
    except AssertionError:
        raise SystemExit("ERROR: 504 - Connection to the server timed out")

    return clumps


def handleStrandFlippingAndSave(associationReturnObj, filePath):
    import myvariant
    import contextlib, io

    # print("Performing strand flipping where needed. Please be patient as we download the needed data")

    # preventing print statements from being outputted to terminal
    f = io.StringIO()
    with contextlib.redirect_stdout(f):
        rsIDs = (x for x in associationReturnObj['associations'].keys() if "rs" in x)
        # returns info about the rsIDs passed
        mv = myvariant.MyVariantInfo()
        queryResultsObj = mv.querymany(rsIDs, scopes='dbsnp.rsid', fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref', returnall=True)
    output = f.getvalue()

    # print("Data downloaded")

    rsIDToAlleles = []

    for obj in queryResultsObj['out']:
        rsID = obj['query']
        if (rsID not in rsIDToAlleles and 'dbsnp' in obj):
            # creating a set of possible alleles for the snp to check our riskAlleles against
            alleles = set()
            if ('alleles' in obj['dbsnp']):
                for alleleObj in obj['dbsnp']['alleles']:
                    alleles.add(alleleObj['allele'])
            if ('ref' in obj['dbsnp'] and obj['dbsnp']['ref'] != ""):
                alleles.add(obj['dbsnp']['ref'])
            if ('alt' in obj['dbsnp'] and obj['dbsnp']['alt'] != ""):
                alleles.add(obj['dbsnp']['alt'])
            if (len(alleles) == 0):
                print(obj, "STILL NO ALLELES")
            
            if (rsID in associationReturnObj['associations']):
                for trait in associationReturnObj['associations'][rsID]['traits']:
                    for studyID in associationReturnObj['associations'][rsID]['traits'][trait]:
                        riskAllele = associationReturnObj['associations'][rsID]['traits'][trait][studyID]['riskAllele']
                        # if the current risk allele seems like it isn't correct and the length of the risk allele is only one base, try its complement
                        if riskAllele not in alleles and len(riskAllele) == 1:
                            complement = getComplement(riskAllele)
                            if complement in alleles:
                                associationReturnObj['associations'][rsID]['traits'][trait][studyID]['riskAllele'] = complement

            rsIDToAlleles.append(rsID)

            #TODO: what to do if we have merged rsIDs? 
            # we could add the rsID of what the old one merged into
            # queryResultsObj = mv.querymany(queryResultsObj['missing'], scopes='dbsnp.dbsnp_merges.rsid', fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref', returnall=True)

            #loop through the ones we couldn't find
            #see if we can get them from a dbsnp.dbsnp_merges.rsid

    # write the associations to a file
    f = open(filePath, 'w', encoding="utf-8")
    f.write(json.dumps(associationReturnObj))
    f.close()
    return 


def getComplement(allele):
    complements = {
        'G': 'C',
        'C': 'G',
        'A': 'T',
        'T': 'A'
    }
    return(complements[allele])


def checkInternetConnection():
    try:
        import socket
        socket.create_connection(("1.1.1.1", 53))
        return
    except OSError:
        raise SystemExit("ERROR: No internet - Check your connection")
