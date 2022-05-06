from os import path
from sys import argv
import unicodedata

# This program normalizes the characters in the associations table.
# How to run: python3 normalizeChars.py "associationTableFolderPath"
# where: "associationTableFolderPath" is the path to the folder where the associations table is stored

associationTableFolderPath = argv[1] if len(argv) > 1 else "../tables/"
associationsTablePath = path.join(associationTableFolderPath, "associations_table.tsv")

associationTableLines = []

# append all normalized lines to a list
with open(associationsTablePath, "r", encoding="utf-8") as associationTable:
    for line in associationTable:
        # from the wikipedia unicode equivalence documentation: NFKD: "Characters are decomposed by compatibility, and multiple combining characters are arranged in a specific order."
        associationTableLines.append(unicodedata.normalize("NFKD", line))

# print normalized lines from the list to the original output file
with open(associationsTablePath, "w", encoding="utf-8") as associationTable:
    for line in associationTableLines:
        associationTable.write(line)
