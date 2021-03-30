#!/bin/bash

# $PLINK_BIN = path to plink source code
# $1 = path to bim file
# $2 = path to intermediate file that will include duplicates
# $3 = base name of plink binary file set
# $4 = base name of plink binary file set (now filtered to remove duplicates)

cut -f 2 "$1" | sort | uniq -d > "$2"
$PLINK_BIN --bfile "$3" --exclude "$2" --make-bed --out "$4"
