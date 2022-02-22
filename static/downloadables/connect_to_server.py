import json
import requests
import os
import os.path
import time
import datetime
from sys import argv
from grep_file import openFileForParsing

# get the associations and clumps from the Server
def retrieveAssociationsAndClumps(refGen, traits, studyTypes, studyIDs, ethnicity, valueTypes, sexes, superPop, fileHash, extension, mafCohort):
    checkInternetConnection()

    # if the extension is .txt and the mafCohort is user -- Fail this is not a valid combination
    if extension == '.txt' and mafCohort == 'user':
        raise SystemExit('\nIn order to use the "user" option for maf cohort, you must upload a vcf, not a txt file. Please upload a vcf instead, or select a different maf cohort option. \n\n')

    if mafCohort.startswith("adni"):
        mafCohort = "adni"

    # Format variables used for getting associations
    traits = traits.split(" ") if traits != "" else None
    if traits is not None:
        traits = [sub.replace('_', ' ').replace("\\'", "\'") for sub in traits]
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    sexes = sexes.split(" ") if sexes != "" else None
    valueTypes = valueTypes.split(" ") if valueTypes != "" else None
    ethnicity = ethnicity.split(" ") if ethnicity != "" else None

    if (ethnicity is not None):
        ethnicity = [sub.replace('_', ' ').replace('"', '').lower() for sub in ethnicity]
        availableEthnicities = getUrlWithParams("https://prs.byu.edu/ethnicities", params={})
        if (not bool(set(ethnicity) & set(availableEthnicities)) and studyIDs is None):
            raise SystemExit('\nThe ethnicities requested are invalid. \nPlease use an ethnicity option from the list: \n\n{}'.format(availableEthnicities))

    workingFilesPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    associationsPath = ""

    # if the directory doesn't exist, make it, and we will need to download the files
    if not os.path.exists(workingFilesPath):
        os.mkdir(workingFilesPath)

    # Create the set that will include all the user-preferred super populations that correspond to the associations
    allSuperPops = set()
    isFilters = False

    # if the user didn't give anything to filter by, get all the associations
    if (traits is None and studyTypes is None and studyIDs is None and ethnicity is None and sexes is None and valueTypes is None):
        # if we need to download a new all associations file, write to file
        associFileName = "allAssociations_{refGen}.txt".format(refGen=refGen)
        associationsPath = os.path.join(workingFilesPath, associFileName)

        allSuperPops |= set(['AFR', 'AMR', 'EAS', 'EUR', 'SAS'])

        if (checkForAllAssociFile(refGen)):
            associationsReturnObj = getAllAssociations(refGen)
            studySnpsPath = os.path.join(workingFilesPath, "traitStudyIDToSnps.txt")
            studySnpsData = getAllStudySnps()
        
        if (checkForAllMAFFiles(mafCohort, refGen)):
            mafPath = os.path.join(workingFilesPath, "{m}_maf_{r}.txt".format(m=mafCohort, r=refGen))
            mafData = getAllMaf(mafCohort, refGen)
        
    # else get the associations using the given filters
    else:
        isFilters = True

        fileName = "associations_{ahash}.txt".format(ahash = fileHash)
        associationsPath = os.path.join(workingFilesPath, fileName)
        associationsReturnObj, finalStudyList = getSpecificAssociations(refGen, traits, studyTypes, studyIDs, ethnicity, valueTypes, sexes)

	# get the set of super populations that correspond to the associations
        for study in associationsReturnObj['studyIDsToMetaData'].keys():
            for trait in associationsReturnObj['studyIDsToMetaData'][study]['traits'].keys():
                superPopList = associationsReturnObj['studyIDsToMetaData'][study]['traits'][trait]['superPopulations']
                preferredPop = getPreferredPop(superPopList, superPop)
                allSuperPops.add(preferredPop)

        # grab all the snps or positions to use for getting the clumps
        snpsFromAssociations = list(associationsReturnObj['associations'].keys())

        #download the maf from database
        fileName = "{m}_maf_{ahash}.txt".format(m=mafCohort, ahash = fileHash)
        mafPath = os.path.join(workingFilesPath, fileName)
        mafData = getMaf(mafCohort, refGen, snpsFromAssociations)
        
        # get the study:snps info
        fileName = "traitStudyIDToSnps_{ahash}.txt".format(ahash = fileHash)
        studySnpsPath = os.path.join(workingFilesPath, fileName)
        studySnpsData = getSpecificStudySnps(finalStudyList)

    # check to see if associationsReturnObj is instantiated in the local variables
    if 'associationsReturnObj' in locals():
        f = open(associationsPath, 'w', encoding="utf-8")
        f.write(json.dumps(associationsReturnObj))
        f.close()

    if 'mafData' in locals():
        f = open(mafPath, 'w', encoding="utf-8")
        f.write(json.dumps(mafData))
        f.close()
    elif mafCohort != 'user':
        raise SystemExit("ERROR: We were not able to retrieve the Minor Allele Frequency data at this time. Please try again.")

    # check to see if studySnpsData is instantiated in the local variables
    if 'studySnpsData' in locals():
        f = open(studySnpsPath, 'w', encoding="utf-8")
        f.write(json.dumps(studySnpsData))
        f.close()
    
    for pop in allSuperPops:
        if isFilters:
            #download clumps from database
            fileName = "{p}_clumps_{r}_{ahash}.txt".format(p = pop, r = refGen, ahash = fileHash)
            clumpsPath = os.path.join(workingFilesPath, fileName)
            # get clumps using the refGen and superpopulation
            clumpsData = getClumps(refGen, pop, snpsFromAssociations)
        else:
            if (checkForAllClumps(pop, refGen)):
                clumpsPath = os.path.join(workingFilesPath, "{p}_clumps_{r}.txt".format(p=pop, r=refGen))
                clumpsData = getAllClumps(refGen, pop)
	    
        # check to see if clumpsData is instantiated in the local variables
        if 'clumpsData' in locals():
            f = open(clumpsPath, 'w', encoding="utf-8")
            f.write(json.dumps(clumpsData))
            f.close()

    return


# format the uploaded GWAS data and get the clumps from the server
def formatGWASAndRetrieveClumps(GWASfile, userGwasBeta, GWASextension, GWASrefGen, refGen, superPop, mafCohort, fileHash, extension):
    checkInternetConnection()

    # if the extension is .txt and the mafCohort is user -- Fail this is not a valid combination
    if extension == '.txt' and mafCohort == 'user':
        raise SystemExit('\nIn order to use the "user" option for maf cohort, you must upload a vcf, not a txt file. Please upload a vcf instead, or select a different maf cohort option. \n\n')

    GWASfileOpen = openFileForParsing(GWASfile, True)

    allSuperPops = set()

    associationDict = {}
    chromSnpDict = {}
    studyIDsToMetaData = {}
    studySnpsData = {}

    sii = -1 # studyID index
    ti = -1 # trait index
    spi = -1 # super population index
    si = -1 # snp index
    ci = -1 # chromosome index
    pi = -1 # position index
    rai = -1 # risk allele index
    ori = -1 # odds ratio index
    bvi = -1 # beta value index
    bui = -1 # beta unit index
    pvi = -1 # p-value index
    cti = -1 # citation index
    rti = -1 # reported trait index
    pvai = -1 # pvalue annotation index
    bai = -1 # beta annotation index

    firstLine = True
    duplicatesSet = set()

    for line in GWASfileOpen:
        if firstLine:
            firstLine = False
            headers = line.rstrip("\r").rstrip("\n").lower().split("\t")

            try:
                sii = headers.index("study id")
                ti = headers.index("trait")
                spi = headers.index("super population")
                si = headers.index("rsid")
                ci = headers.index("chromosome")
                pi = headers.index("position")
                rai = headers.index("risk allele")
                ori = headers.index("odds ratio")
                if userGwasBeta:
                    bvi = headers.index("beta coefficient")
                    bui = headers.index("beta units")
                else:
                    ori = headers.index("odds ratio")
                pvi = headers.index("p-value")
            except ValueError:
                raise SystemExit("ERROR: The GWAS file format is not correct. Please check your file to ensure the required columns are present in a tab separated format.")

            cti = headers.index("citation") if "citation" in headers else -1
            rti = headers.index("reported trait") if "reported trait" in headers else -1
            pvai = headers.index("p-value annotation") if "p-value annotation" in headers else -1
            bai = headers.index("beta annotation") if "beta annotation" in headers else -1

        else:
	    # Add super population to the super population set
            preferredPop = getPreferredPop(line[spi], superPop)
            allSuperPops.add(preferredPop)

            line = line.rstrip("\r").rstrip("\n").split("\t")
            # create the chrom:pos to snp dict
            # if the chrom:pos not in the chromSnpDict
            chromPos = ":".join([line[ci], line[pi]])
            if chromPos not in chromSnpDict:
                # add the chrom:pos with the snp rsID
                chromSnpDict[chromPos] = line[si]
            
            # create the snp to associations stuff dict
            # if snp not in associationsDict
            if line[si] not in associationDict:
                associationDict[line[si]] = {
                    "pos": chromPos,
                    "traits": {}
                }
            # if trait not in associationsDict[snp][traits]
            if line[ti] not in associationDict[line[si]]["traits"]:
                associationDict[line[si]]["traits"][line[ti]] = {}
            # if studyID not in associationDict[snp]["traits"][trait]
            if line[sii] not in associationDict[line[si]]["traits"][line[ti]]:
                associationDict[line[si]]["traits"][line[ti]][line[sii]] = {}
            # if pvalannotation not in associationDict[line[si]]["traits"][line[ti]][line[sii]]
            pValueAnnotation = line[pvai] if pvai != -1 else "NA"
            betaAnnotation = line[bai] if bai != -1 else "NA"
            valueType = "beta" if userGwasBeta else "OR"
            pvalBetaAnnoValType = pValueAnnotation + "|" + betaAnnotation + "|" + valueType
            if pvalBetaAnnoValType not in associationDict[line[si]]["traits"][line[ti]][line[sii]]:
                # perform strand flipping TODO THIS MIGHT BE SOMETHING THAT NEEDS TO CHANGE
                riskAllele = runStrandFlipping(line[si], line[rai])
                associationDict[line[si]]["traits"][line[ti]][line[sii]][pvalBetaAnnoValType] = {
                    "riskAllele": riskAllele,
                    "pValue": float(line[pvi]),
                    "sex": "NA",
                    "ogValueTypes": 'beta' if userGwasBeta else 'or'
                }
                if userGwasBeta:
                    associationDict[line[si]]["traits"][line[ti]][line[sii]][pvalBetaAnnoValType]['betaValue'] = float(line[bvi])
                    associationDict[line[si]]["traits"][line[ti]][line[sii]][pvalBetaAnnoValType]['betaUnit'] = line[bui]
                else:
                    associationDict[line[si]]["traits"][line[ti]][line[sii]][pvalBetaAnnoValType]['oddsRatio'] = float(line[ori])
            else:
                # if the snp is duplicated, notify the user and exit
                raise SystemExit("ERROR: The GWAS file contains at least one duplicated snp for the following combination. {}, {}, {}, {}, . \n Please ensure that there is only one snp for each combination.".format(line[si], line[ti], line[sii], pvalBetaAnnoValType))

            # create the metadata info dict
            # if the studyID is not in the studyIDsToMetaData
            if line[sii] not in studyIDsToMetaData:
                studyIDsToMetaData[line[sii]] = {
                    "citation": line[cti] if cti != -1 else "",
                    "reportedTrait": line[rti] if rti != -1 else "",
                    "studyTypes": [],
                    "traits": {},
                    "ethnicity": []
                }
            # if the trait is not in the studyIDsToMetaData[studyID]["traits"]
            if line[ti] not in studyIDsToMetaData[line[sii]]["traits"]:
                # add the trait
                studyIDsToMetaData[line[sii]]["traits"][line[ti]] = {
                    "studyTypes": [],
                    "pValBetaAnnoValType": [pvalBetaAnnoValType],
                    "superPopulations": [line[spi]]
                }
            else:
                studyIDsToMetaData[line[sii]]["traits"][line[ti]]['pValBetaAnnoValType'].append(pvalBetaAnnoValType)
		
            # create studyID/trait/pValueAnnotation to snps
            # if trait|studyID|pValueAnnotation not in the studySnpsData
            traitStudyIDPValAnno = "|".join([line[ti], line[sii]], pvalBetaAnnoValType)
            if traitStudyIDPValAnno not in studySnpsData:
                studySnpsData[traitStudyIDPValAnno] = []
            # add snp to the traitStudyIDToSnp
            studySnpsData[traitStudyIDPValAnno].append(line[si])

    GWASfileOpen.close()

    # remove duplicated associations
    for (snp, trait, studyID) in duplicatesSet:
        del associationDict[snp]["traits"][trait][studyID]
        if associationDict[snp]["traits"][trait] == {}:
            del associationDict[snp]["traits"][trait]
            if associationDict[snp]["traits"] == {}:
                del associationDict[snp]

    # if the samples reference genome does not equal the gwas reference genome, get a dictionary with the correct positions
    if GWASrefGen != refGen:
        snps = list(associationDict.keys())
        chromSnpDict = getUrlWithParams("https://prs.byu.edu/snps_to_chrom_pos", { "snps": snps, "refGen": refGen })

    mergedAssociDict = dict()
    mergedAssociDict.update(associationDict)
    mergedAssociDict.update(chromSnpDict)
    chromPos = list(chromSnpDict.keys())

    associationsReturnObj = {
        "associations": mergedAssociDict,
        "studyIDsToMetaData": studyIDsToMetaData
    }
        
    workingFilesPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    # if the directory doesn't exist, make it, and we will need to download the files
    if not os.path.exists(workingFilesPath):
        os.mkdir(workingFilesPath)
    
    fileName = "GWASassociations_{fileHash}.txt".format(fileHash=fileHash)
    associationsPath = os.path.join(workingFilesPath, fileName)


    # Access and write the clumps file for each of the super populations preferred in the GWAS file
    for pop in allSuperPops:
        fileName = "{pop}_clumps_{refGen}_{fileHash}.txt".format(pop=pop, refGen=refGen, fileHash=fileHash)
        clumpsPath = os.path.join(workingFilesPath, fileName)

        # get clumps using the refGen and superpopulation
        clumpsData = getClumps(refGen, pop, chromPos)

        # check to see if clumpsData is instantiated in the local variables
        if 'clumpsData' in locals():
            f = open(clumpsPath, 'w', encoding="utf-8")
            f.write(json.dumps(clumpsData))
            f.close()

    #get maf data using the refgen and mafcohort
    fileName = "{m}_maf_{ahash}.txt".format(n=mafCohort, ahash=fileHash)
    mafPath = os.path.join(workingFilesPath, fileName)
    mafData = getMaf(mafCohort, refGen, chromPos)

    # get the study:snps info
    fileName = "traitStudyIDToSnps_{ahash}.txt".format(ahash = fileHash)
    studySnpsPath = os.path.join(workingFilesPath, fileName)

    # check to see if associationsReturnObj is instantiated in the local variables
    if 'associationsReturnObj' in locals():
        f = open(associationsPath, 'w', encoding="utf-8")
        f.write(json.dumps(associationsReturnObj))
        f.close()

    if 'mafData' in locals():
        f = open(mafPath, 'w', encoding='utf-8')
        f.write(json.dumps(mafData))
        f.close()

    # check to see if studySnpsDat is instantiated in the local variables
    if 'studySnpsData' in locals():
        f = open(studySnpsPath, 'w', encoding="utf-8")
        f.write(json.dumps(studySnpsData))
        f.close()

    return


def checkForAllAssociFile(refGen):
    # assume we will need to download new files
    dnldNewAllAssociFile = True
    # check to see if the workingFiles directory is there, if not make the directory
    scriptPath = os.path.dirname(os.path.abspath(__file__))
    workingFilesPath = os.path.join(scriptPath, ".workingFiles")
    # path to a file containing all the associations from the database
    associFileName = "allAssociations_{refGen}.txt".format(refGen=refGen)
    allAssociationsFile = os.path.join(workingFilesPath, associFileName)

    # if the path exists, check if we don't need to download a new one
    if os.path.exists(allAssociationsFile):

        # get date the database was last updated
        params = {
            "refGen": refGen
        }

        response = requests.get(url="https://prs.byu.edu/last_database_update", params=params)
        response.close()
        assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
        lastDatabaseUpdate = response.text
        lastDatabaseUpdate = lastDatabaseUpdate.split("-")
        lastDBUpdateDate = datetime.date(int(lastDatabaseUpdate[0]), int(lastDatabaseUpdate[1]), int(lastDatabaseUpdate[2]))

        fileModDateObj = time.localtime(os.path.getmtime(allAssociationsFile))
        fileModDate = datetime.date(fileModDateObj.tm_year, fileModDateObj.tm_mon, fileModDateObj.tm_mday)
        # if the file is newer than the database update, we don't need to download a new file
        if (lastDBUpdateDate < fileModDate):
            dnldNewAllAssociFile = False

    return dnldNewAllAssociFile


def checkForAllClumps(pop, refGen):
    # assume we need to download new file
    dnldNewClumps = True
    # check to see if the workingFiles directory is there, if not make the directory
    scriptPath = os.path.dirname(os.path.abspath(__file__))
    workingFilesPath = os.path.join(scriptPath, ".workingFiles")

    # path to a file containing all the clumps from the database
    allClumpsFile = os.path.join(workingFilesPath, "{0}_clumps_{1}.txt".format(pop, refGen))

    # if the path exists, check if we don't need to download a new one
    if os.path.exists(allClumpsFile):
        params = {
            "refGen": refGen,
            "superPop": pop
        }

        response = requests.get(url="https://prs.byu.edu/last_clumps_update", params=params)
        response.close()
        assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason)
        lastClumpsUpdate = response.text
        lastClumpsUpdate = lastClumpsUpdate.split('-')
        lastClumpsUpdate = datetime.date(int(lastClumpsUpdate[0]), int(lastClumpsUpdate[1]), int(lastClumpsUpdate[2]))

        fileModDateObj = time.localtime(os.path.getmtime(allClumpsFile))
        fileModDate = datetime.date(fileModDateObj.tm_year, fileModDateObj.tm_mon, fileModDateObj.tm_mday)
        # if the file is newer than the database update, we don't need to download a new file
        if (lastClumpsUpdate <= fileModDate):
            dnldNewClumps = False

    return dnldNewClumps


def checkForAllMAFFiles(mafCohort, refGen):
    dnldNewMaf = True
    # check to see if the workingFiles directory is there, if not make the directory
    scriptPath = os.path.dirname(os.path.abspath(__file__))
    workingFilesPath = os.path.join(scriptPath, ".workingFiles")

    # path to a file containing all maf for the cohort from the database
    allMAFfile = os.path.join(workingFilesPath, "{0}_maf_{1}.txt".format(mafCohort, refGen))

    # if the path exists, check if we don't need to download a new one
    if os.path.exists(allMAFfile):
        params = {
            "mafCohort": mafCohort
        }

        response = requests.get(url="https://prs.byu.edu/last_maf_update", params=params)
        response.close()
        assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason)
        lastMafUpdate = response.text
        lastMafUpdate = lastMafUpdate.split('-')
        lastMafUpdate = datetime.date(int(lastMafUpdate[0]), int(lastMafUpdate[1]), int(lastMafUpdate[2]))

        fileModDateObj = time.localtime(os.path.getmtime(allMAFfile))
        fileModDate = datetime.date(fileModDateObj.tm_year, fileModDateObj.tm_mon, fileModDateObj.tm_mday)
        # if the file is newer than the database update, we don't need to download a new file
        if (lastMafUpdate <= fileModDate):
            dnldNewMaf = False

    return dnldNewMaf


# gets associations obj download from the Server
def getAllAssociations(refGen): 
    params = {
        "refGen": refGen,
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


def getAllMaf(mafCohort, refGen):
    if (mafCohort == 'user'): return {}
    params = {
        "cohort": mafCohort,
        "refGen": refGen
    }
    mafReturnedObj = getUrlWithParams("https://prs.byu.edu/get_maf_download_file", params=params)
    return mafReturnedObj


# gets study snps file download from the Server
# gets a list of snps for all of the unique trait/pValueAnnotation/betaAnnotation/valueType/studyID combinations
def getAllStudySnps(): 
    studySnpsReturnObj = getUrlWithParams("https://prs.byu.edu/get_traitStudyID_to_snp", params={})
    # Organized with study as the Keys and snps as values
    return studySnpsReturnObj


# This function is used to combine json from all the separate calls into one json object. Due to the amount of nesting in the json
# this is the neccesary way to properly combine
def combineJson(old, new):
    studyMeta = new["studyIDsToMetaData"]
    associations = new["associations"]

    for studyID in studyMeta:
        if studyID not in old["studyIDsToMetaData"]:
            old["studyIDsToMetaData"][studyID] = studyMeta[studyID]
        else:
            for trait in studyMeta[studyID]["traits"]:
                if trait not in old["studyIDsToMetaData"][studyID]["traits"]:
                    old["studyIDsToMetaData"][studyID]["traits"][trait] = studyMeta[studyID]["traits"][trait]

    for snp in associations:
        if snp not in old["associations"]:
            old["associations"][snp] = associations[snp]
        elif snp.startswith("rs"):
            for trait in associations[snp]["traits"]:
                if trait not in old["associations"][snp]["traits"]:
                    old["associations"][snp]["traits"][trait] = associations[snp]["traits"][trait]
                else:
                    for studyID in associations[snp]["traits"][trait]:
                        if studyID not in old["associations"][snp]["traits"][trait]:
                            old["associations"][snp]["traits"][trait][studyID] = associations[snp]["traits"][trait][studyID]
                        else:
                            for pValBetaAnnoValType in associations[snp]["traits"][trait][studyID]:
                                if pValBetaAnnoValType not in old["associations"][snp]["traits"][trait][studyID]:
                                    old["associations"][snp]["traits"][trait][studyID][pValBetaAnnoValType] = associations[snp]["traits"][trait][studyID][pValBetaAnnoValType]
    new = {}
    return old


# gets associationReturnObj using the given filters
def getSpecificAssociations(refGen, traits, studyTypes, studyIDs, ethnicity, valueTypes, sexes):
    finalStudyList = []
    associationData = {
        "studyIDsToMetaData" : {},
        "associations": {}
    }

    if (traits is not None or studyTypes is not None or ethnicity is not None or valueTypes is not None or sexes is not None):
        # get the studies matching the parameters
        body = {
            "traits": traits, 
            "studyTypes": studyTypes,
            "ethnicities": ethnicity,
            "sexes": sexes,
            "ogValueTypes": valueTypes
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
                        "studyID": study['studyID'],
                        "pValueAnnotation": study['pValueAnnotation'],
                        "betaAnnotation": study['betaAnnotation'],
                        "ogValueTypes" : study['ogValueTypes']
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
                "studyID": studyIDDataList[i]['studyID'],
                "pValueAnnotation": studyIDDataList[i]['pValueAnnotation'],
                "betaAnnotation": studyIDDataList[i]['betaAnnotation'],
                "ogValueTypes" : studyIDDataList[i]['ogValueTypes']
            }))

    if finalStudyList == []:
        raise SystemExit("No studies with those filters exist because your filters are too narrow or invalid. Check your filters and try again.")

    # Breaking up the calls to the get_associations endpoint so that we don't got over the Request size limit
    try:
        lengthOfList = len(finalStudyList)
        i = 0
        j = 1000 if lengthOfList > 1000 else lengthOfList
        print("Getting associations and studies")
        print("Total number of studies: {}". format(lengthOfList))
        runLoop = True
        while runLoop:
            if j == lengthOfList:
                runLoop = False
            # get the associations based on the studyIDs
            print("{}...".format(j), end = "", flush=True)
            body = {
                "refGen": refGen,
                "studyIDObjs": finalStudyList[i:j],
                "sexes": sexes,
                "ogValueType": valueTypes
            }
            tmpAssociationsData = postUrlWithBody("https://prs.byu.edu/get_associations", body=body)
            associationData = combineJson(associationData, tmpAssociationsData)
            i = j
            j = j + 1000 if lengthOfList > j + 1000 else lengthOfList
        print('Done\n')
    except AssertionError:
        raise SystemExit("ERROR: 504 - Connection to the server timed out")
    return associationData, finalStudyList


def runStrandFlipping(snp, allele):
    import myvariant
    from Bio.Seq import Seq

    mv = myvariant.MyVariantInfo()

    possibleAlleles = getVariantAlleles(snp, mv)
    riskAllele = Seq(allele)
    if riskAllele not in possibleAlleles:
        complement = riskAllele.reverse_complement()
        if complement in possibleAlleles:
            print("WE MADE A SWITCH", snp, riskAllele, complement)
            riskAllele = complement
    
    return str(riskAllele)


def getVariantAlleles(rsID, mv):
    import contextlib, io

    f=io.StringIO()
    with contextlib.redirect_stdout(f):
        queryResult = mv.query('dbsnp.rsid:{}'.format(rsID), fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref')
    output = f.getvalue()

    objs = queryResult['hits'][0] if len(queryResult['hits']) > 0 else None

    alleles = set()
    if objs is not None:
        for obj in objs:
            if ('alleles' in obj['dbsnp']):
                for alleleObj in obj['dbsnp']['alleles']:
                    alleles.add(alleleObj['allele'])
            if ('ref' in obj['dbsnp'] and obj['dbsnp']['ref'] != ""):
                alleles.add(obj['dbsnp']['ref'])
            if ('alt' in obj['dbsnp'] and obj['dbsnp']['alt'] != ""):
                alleles.add(obj['dbsnp']['alt'])
            if (len(alleles) == 0):
                print(obj, "STILL NO ALLELES")
    else:
        # TODO maybe: try to find it with a merged snp?
        pass

    return alleles


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


# get maf using the maf cohort
def getMaf(mafCohort, refGen, snpsFromAssociations):
    # if the cohort is user, return empty, we will use the user maf
    if (mafCohort == 'user'): return {}

    body = {
        "cohort": mafCohort,
        "refGen": refGen
    }
    print("Retrieving maf information")
    
    try:
        chromToPosMap = {}
        maf = {}
        for pos in snpsFromAssociations:
            if (len(pos.split(":")) > 1):
                chrom,posit = pos.split(":")
                if (chrom not in chromToPosMap.keys()):
                    chromToPosMap[chrom] = [posit]
                else:
                    chromToPosMap[chrom].append(posit)

        for chrom in chromToPosMap:
            print("{0}...".format(chrom), end="", flush=True)
            body['chrom'] = chrom
            body['pos'] = chromToPosMap[chrom]
            maf = {**postUrlWithBody("https://prs.byu.edu/get_maf", body), **maf}
        print('\n')
    except AssertionError:
        raise SystemExit("ERROR: 504 - Connection to the server timed out")

    return maf


# gets associationReturnObj using the given filters
def getSpecificStudySnps(finalStudyList):
    # get the studies matching the parameters
    studySnps = {}
    lengthOfList = len(finalStudyList)
    i = 0
    j = 1000 if lengthOfList > 1000 else lengthOfList
    print("Getting snps to studies map")
    print("Total number of studies: {}". format(lengthOfList))
    runLoop = True
    try:
        while runLoop:
            if j == lengthOfList:
                runLoop = False
            # get the associations based on the studyIDs
            print("{}...".format(j), end = "", flush=True)
            body = {
                "studyIDObjs":finalStudyList[i:j]
            }
            tmpStudySnps = postUrlWithBody("https://prs.byu.edu/snps_to_trait_studyID", body)
            for key in tmpStudySnps:
                if key not in studySnps:
                    studySnps[key] = tmpStudySnps[key]
            i = j
            j = j + 1000 if lengthOfList > j + 1000 else lengthOfList
        print("Done\n")

    except AssertionError:
        raise SystemExit("ERROR: 504 - Connection to the server timed out")
    
    return studySnps


def checkInternetConnection():
    try:
        import socket
        # using an arbitrary connection to check if we can make one
        socket.create_connection(("8.8.8.8", 53))
        return
    except OSError:
        raise SystemExit("ERROR: No internet - Check your connection")


def getPreferredPop(popList, superPop):
    if len(popList) == 1 and str(popList[0]) == 'NA':
        return(superPop)
    elif superPop in popList:
        return (superPop)
    else:
        filteredKeys = []
        if superPop == 'EUR':
            keys=['EUR', 'AMR', 'SAS', 'EAS', 'AFR']
        elif superPop == 'AMR':
            keys=['AMR', 'EUR', 'SAS', 'EAS', 'AFR']
        elif superPop == 'SAS':
            keys=['SAS', 'EAS', 'EUR', 'AMR', 'AFR']
        elif superPop == 'EAS':
            keys=['EAS', 'SAS', 'EUR', 'AMR', 'AFR']
	#TODO: check with justin if these heirarchies are correct
        elif superPop == 'AFR':
            keys=['AFR', 'EUR', 'AMR', 'SAS', 'EAS']
        for pop in keys:
            if pop == 'EUR':
                tryPop = 'European'
            elif pop == 'AMR':
                tryPop = 'American'
            elif pop == 'AFR':
                tryPop = 'African'
            elif pop == 'EAS':
                tryPop = 'East Asian'
            elif pop == 'SAS':
                tryPop = 'South Asian'

            if tryPop in popList:
                filteredKeys.append(pop)
        values = list(range(0,len(filteredKeys)))
        heirarchy = dict(zip(filteredKeys, values))
        preferredPop = min(heirarchy, key=heirarchy.get)

    return preferredPop
	
if __name__ == "__main__":
    if argv[1] == "GWAS":
        formatGWASAndRetrieveClumps(argv[2], argv[3], argv[4], argv[5], argv[6], argv[7], argv[8])
    else:
        retrieveAssociationsAndClumps(argv[1], argv[2], argv[3], argv[4], argv[5], argv[6], argv[7], argv[8], argv[9], argv[10], argv[11])
