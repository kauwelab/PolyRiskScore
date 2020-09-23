import calculate_score  as cs
import time
import sys

#start = time.time()
# $1=intermediateFile $2=pValue $3=outputType $4="${tableObj}" $5="${clumpsObj}" $6=refGen $7=outputFile $8=superPop
tableObjList = ""
with open(sys.argv[4], 'r') as tableObjFile:
    tableObjList = tableObjFile.read()
with open(sys.argv[5], 'r') as clumpsObjFile:
    clumpsObjList = clumpsObjFile.read()
results = cs.calculateScore(sys.argv[1], sys.argv[2], sys.argv[3], tableObjList, clumpsObjList, sys.argv[6], sys.argv[8])
#end = time.time()
#print(end - start)
f = open(sys.argv[7], 'w')
f.write(results)
f.close()
