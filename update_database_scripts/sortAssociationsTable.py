import csv
from os import path
from sys import argv

# This script orders a preexisting associations_table so that studyIDs are ordered and then SNPs. After ordering, adds an id 
# column starting at 1 and incrementing by 1 for every new row.

# How to run: Rscript orderAssociations.py "associationTableFolderPath"
# where "associationTableFolderPath" is the path to the folder where the association table TSV is stored (default: "../tables/")

# get args from the commandline
associationTableFolderPath = argv[1] if len(argv) > 1 else "../tables/"
associationTablePath = path.join(associationTableFolderPath, "associations_table.tsv")

studyIDColumn = 14
snpColumn = 0

sortedList = {}
header = []
idAlreadyAdded = False

print("Sorting the associations table and adding the 'id' column.")

with open(associationTablePath, "r") as readFile:
    reader = csv.reader(readFile, delimiter='\t', lineterminator='\n')
    # get the header row and add the "id" column if it doesn't already exist
    header = next(reader)
    if header[0] == "id":
        print("id column already added.")
        idAlreadyAdded = True
        # add 1 to the row indecies of each of the columns to sort on
        studyIDColumn += 1
        snpColumn += 1
    else:
        header.insert(0, "id")
    # sort all the rows by the 14th column (studyID) and 0th column (snp)
    sortedList = sorted(reader, key=lambda row: (str(row[studyIDColumn]), str(row[snpColumn])))

with open(associationTablePath, "w") as writeFile:
    writer = csv.writer(writeFile, delimiter='\t', lineterminator='\n')
    # write the header to the file
    writer.writerow(header)
    i = 1
    # write out each row, adding the corresponding id to the beginning of the row if it isn't already there
    for row in sortedList:
        if not idAlreadyAdded:
            row.insert(0, i)
            i += 1
        writer.writerow(row)

if not idAlreadyAdded:
    print("Sorted the associations table and added the id column.")
else:
    print("Sorted the associations table.")