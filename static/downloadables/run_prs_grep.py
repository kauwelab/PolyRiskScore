import calculate_score  as cs
import time
import sys

#start = time.time()
# $1=intermediateFile $2=diseaseArray $3=pValue $4=outputType $5="${tableObj}" $6=${clumpsObj} $7=refGen $8=outputFile $9=Superpop
tableObjList = ""
with open(sys.argv[5], 'r') as tableObjFile:
    tableObjList = tableObjFile.read()
with open(sys.argv[6], 'r') as clumpsObjFile:
    clumpsObjList = clumpsObjFile.read()
results = cs.calculateScore(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], tableObjList, clumpsObjList, sys.argv[7], sys.argv[9])
#end = time.time()
#print(end - start)
f = open(sys.argv[8], 'w')
f.write(results)
f.close()
