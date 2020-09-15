import calculate_score  as cs
import time
import sys

#start = time.time()
#$1=intermediateFile $2=diseaseArray $3=pValue $4=outputType $5="${tableObj}" $6=refGen $7=outputFile $8=Superpop
tableObjList = ""
with open(sys.argv[5], 'r') as tableObjFile:
    tableObjList = tableObjFile.read()
results = cs.calculateScore(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], tableObjList, sys.argv[6], sys.argv[8])
#end = time.time()
#print(end - start)
f = open(sys.argv[7], 'w')
f.write(results)
f.close()
