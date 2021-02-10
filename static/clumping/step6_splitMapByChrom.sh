#!/bin/bash
 
# $1 = path to input file (should be a .map file specific to a certain reference genome and population)

awk '{ print > $1 }' "$1"
