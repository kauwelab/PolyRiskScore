from os import path
from sys import argv
import unicodedata

# This program normalizes the characters in the associations table.
# How to run: python3 normalizeChars.py "associationTableFolderPath"
# where: "associationTableFolderPath" is the path to the folder where the associations table is stored

associationTableFolderPath = argv[1] if len(argv) > 1 else "../tables/"
associationsTablePath = path.join(associationTableFolderPath, "associations_table.tsv")

associationTableLines = []

with open(associationsTablePath, "r", encoding="utf-8") as associationTable:
    for line in associationTable:
        associationTableLines.append(unicodedata.normalize("NFKD", line))

with open(associationsTablePath, "w", encoding="utf-8") as associationTable:
    for line in associationTableLines:
        associationTable.write(line)
