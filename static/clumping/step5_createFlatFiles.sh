#!/bin/bash

# $1 = base name of plink binary file set that has been filtered to remove duplicates
# $2 = base name of output file set

plink --bfile "$1" --recode --out "$2"
