#!/bin/bash

# $1 = path to directory with clumped files (separated by chromsome, but specific to a certain reference genome and population)
# $2 = path to output directory
# $3 = population (used to label output file)
# $4 = reference genome (used to label output file)


for file in "$1"/*.clumped; do
	tail -q -n +2 "$file" >> ${2}${3}_${4}_general_clumps_combined.txt
done
