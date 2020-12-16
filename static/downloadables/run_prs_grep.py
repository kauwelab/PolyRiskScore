import calculate_score  as cs
import time
import sys
import os
import os.path

#start = time.time()
# $1=inputFile $2=pValue $3=outputType $4=refGen $5=superPop $6=outputFile $7=isCondensedFormat $8=fileHash $9=requiredParamsHash, $10=defaultSex
#TODO: will need to have stuff for filtering

basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")

if sys.argv[7] == '0':
    isCondensedFormat = False
else:
    isCondensedFormat = True

specificAssociPath = os.path.join(basePath, "associations_{ahash}.txt".format(ahash = sys.argv[8]))
# get the paths for the associationsFile and clumpsFile
if (sys.argv[8] == sys.argv[9] or not os.path.isfile(specificAssociPath)):
    associationsPath = os.path.join(basePath, "allAssociations_{refGen}_{sex}.txt".format(refGen=sys.argv[4], sex=sys.argv[10][0]))
    clumpsPath = os.path.join(basePath, "{p}_clumps_{r}.txt".format(p = sys.argv[5], r = sys.argv[4]))
else:
    associationsPath = specificAssociPath
    clumpsPath = os.path.join(basePath, "{p}_clumps_{r}_{ahash}.txt".format(p = sys.argv[5], r = sys.argv[4], ahash = sys.argv[8]))

try:
    with open(associationsPath, 'r') as tableObjFile:
        tableObjList = tableObjFile.read()
    with open(clumpsPath, 'r') as clumpsObjFile:
        clumpsObjList = clumpsObjFile.read()
    cs.calculateScore(sys.argv[1], sys.argv[2], sys.argv[3], tableObjList, clumpsObjList, sys.argv[4], isCondensedFormat, sys.argv[6])
except FileNotFoundError: 
    raise SystemExit("ERROR: One or both of the required working files could not be found. \n Paths searched for: \n{0}\n{1}".format(associationsPath, clumpsPath))
#end = time.time()
#print(end - start)
