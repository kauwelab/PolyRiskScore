#!/bin/bash

# $PLINK_BIN = path to plink source code
# $1 = base name of plink binary file set that has been filtered to remove duplicates
# $2 = base name of output file set

$PLINK_BIN --bfile "$1" --recode --out "$2"
