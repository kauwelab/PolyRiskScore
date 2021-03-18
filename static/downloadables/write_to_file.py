import os
import csv
import json

def writeToFile(fileType, params):
    if fileType == "tsv":
        formatTSV(params[0], params[1], params[2], params[3])
    elif fileType == "unused":
        printUnusedTraitStudyPairs(params[0], params[1], params[2], params[3])
    else: #json
        formatJson(params[0], params[1])


def formatTSV(isFirst, newLine, header, outputFile):
    # if the folder of the output file doesn't exist, create it
    if "/" in outputFile:
        os.makedirs(os.path.dirname(outputFile), exist_ok=True)

    if isFirst:
        # work with the file as it is now locked
        with open(outputFile, 'w', newline='', encoding="utf-8") as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(header)
    else:
        with open(outputFile, 'a', newline='', encoding="utf-8") as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(newLine)
    return


# prints the study/trait combos that don't have matching snps to one in the input file
def printUnusedTraitStudyPairs(trait, study, outputFile, isFirst):
    fileBasename = os.path.basename(outputFile)
    fileDirname = os.path.dirname(outputFile)
    fileName, ext = os.path.splitext(fileBasename)
    fileBasename = fileName + "_studiesNotIncluded.txt"
    completeOutputFileName = os.path.join(fileDirname, fileBasename)

    # if the folder of the output file doesn't exist, create it
    if "/" in completeOutputFileName:
        os.makedirs(os.path.dirname(completeOutputFileName), exist_ok=True)

    # if this is the first trait/study to be added, write the header as well
    if isFirst:
        with open(completeOutputFileName, 'w') as openFile:
            openFile.write("Trait/Study combinations with no matching snps in the input file:")
    else:
        with open(completeOutputFileName, 'a') as openFile:
            openFile.write('\n')
            openFile.write(str(trait))
            openFile.write(', ')
            openFile.write(str(study))

    return


def formatJson(studyInfo, outputFile):
    json_output=[]
    json_output.append(studyInfo)
    # if this is the first object to be added, write it to the output file
    if not os.path.exists(outputFile):
        with open(outputFile, 'w', newline='') as f:
            json.dump(json_output, f, indent=4)
    else:
        # if there is already data in the output file, remove the closing ] and add a comma with the new json object and then close the file with a closing ]
        with open(outputFile, 'r+', newline = '') as f:
            f.seek(0,2)
            position = f.tell() -1
            f.seek(position)
            f.write( ",{}]".format(json.dumps(studyInfo, indent=4)))
    return