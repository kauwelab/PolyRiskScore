import vcf_parser_grep  as pg
import time
import sys

#start = time.time()
#$1=intermediateFile $2=diseaseArray $3=pValue $4=outputType $5="${tableObj}" $6=outputFile
tableObjList = ""
with open(sys.argv[5], 'r') as tableObjFile:
    tableObjList = tableObjFile.read()
results = pg.calculateScore(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], tableObjList)
#end = time.time()
#print(end - start)
f = open(sys.argv[6], 'w')
f.write(results)
f.close()