#!/bin/bash

# $1 = path to directory with the map files separated by chromosome
# $2 = path to output directory
# $3 = population (used to label output file)
# $4 = reference genome (used to label output file)

for file in "$1"/*; do
	shortFile=$(basename "$file")
	echo "CHR	SNP	P	POS" > ${2}/${3}_assoc_${4}_"${shortFile%.*}".txt
	cat "$file" >> ${2}/${3}_assoc_${4}_"${shortFile%.*}".txt
done
