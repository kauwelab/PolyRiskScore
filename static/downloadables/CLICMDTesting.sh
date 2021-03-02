
inputFilePath="sample.txt"
outputFolder="./outputFiles"
outputDetails="./outputFiles/outputDetails.txt"
pvalue="0.05"
refGen="hg19"
pop="EUR"

sub="\",\""
repl="\" \""

if [ -f "$outputDetails" ]; then
    rm $outputDetails
fi

echo "Prepping for randomization"

validEthnicities=($(curl -s https://prs.byu.edu/ethnicities | tr -d '[]' | tr -s ' ' '_' | tr -s ',' ' '))
validTraits=$(curl -s https://prs.byu.edu/get_traits | tr -d '[]' | tr -s ' ' '_')
validTraits=(${validTraits//${sub}/${repl}})
validStudyTypes=("HI" "LC" "O")
validStudyIDs=($(curl -s https://prs.byu.edu/get_all_studies | jq -r 'sort_by(.studyID) | .[] | .studyID')) #TODO jq command can struggle on wiindows

getRandomElement () {
    array=($@)
    let len=${#array[@]}-1
    index=$(awk -v min=0 -v max=${len} 'BEGIN{srand(); print int(min+rand()*(max-min+1))}')
    returnVal=$(echo ${array[$index]} | tr -s '_' ' ')
    sleep 2
    echo ${returnVal}
}

echo "Preparation finished."


#TODO should we test multiple populations or refgens?

for i in "../sample.vcf" "../sample.txt"; do #TODO - we will need to add in the output files txt or vcf depending
    if [ $i == "../sample.vcf" ]; then
        fileType="_vcf"
    else
        fileType="_txt"
    fi

    # test 0 (test the basic required parameters. If this fails, we're in trouble!)
    echo -e "Test 0-- -f $i -o $outputFolder/test0${fileType}.tsv -c $pvalue -r $refGen -p $pop"
    echo -e "Test 0-- -f $i -o $outputFolder/test0${fileType}.tsv -c $pvalue -r $refGen -p $pop" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test0${fileType}.tsv" -c $pvalue -r $refGen -p $pop

    # test 1 (-t -k -i -e -v -g -s)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    
    echo -e "Test 1a-- -f $i -o $outputFolder/test1a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e european -v -g f -s 2"
    echo -e "Test 1a-- -f $i -o $outputFolder/test1a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e european -v -g f -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "european" -v 'true' -g "f" -s "2"

    echo -e "Test 1b-- -f $i -o $outputFolder/test1b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e european -v -g f -s 1&2"
    echo -e "Test 1b-- -f $i -o $outputFolder/test1b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e european -v -g f -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "european" -v 'true' -g "f" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "european" -v 'true' -g "f" -s "2"

    # TODO test 2 (test 1 but without internet)


    # test 3 (-t)
    trait=$(getRandomElement ${validTraits[@]})

    echo -e "Test 3-- -f $i -o $outputFolder/test3${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait"
    echo -e "Test 3-- -f $i -o $outputFolder/test3${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test3${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait"

    # test 4 (-t again)
    trait=$(getRandomElement ${validTraits[@]})

    echo -e "Test 4-- -f $i -o $outputFolder/test4${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait"
    echo -e "Test 4-- -f $i -o $outputFolder/test4${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test4${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait"

    # test 5 (2 traits using -t)
    trait1=$(getRandomElement ${validTraits[@]})
    trait2=$(getRandomElement ${validTraits[@]})

    echo -e "Test 5-- -f $i -o $outputFolder/test5${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2"
    echo -e "Test 5-- -f $i -o $outputFolder/test5${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test5${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait1" -t "$trait2"

    # TODO test 6 (test 3 without internet)

    # test 7 (-k)
    studyType=$(getRandomElement ${validStudyTypes[@]})

    echo -e "Test 7---f $i -o $outputFolder/test7${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType"
    echo -e "Test 7---f $i -o $outputFolder/test7${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test7${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType"

    # test 8 (2 study types using -k)
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})

    echo "Test 8-- -f $i -o $outputFolder/test8${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2"
    echo "Test 8-- -f $i -o $outputFolder/test8${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test8${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType1" -k "$studyType2"

    # TODO test 9 (test 7 without internet)

    # test 10 (-i)
    studyID=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 10-- -f $i -o $outputFolder/test10${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID"
    echo -e "Test 10-- -f $i -o $outputFolder/test10${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test10${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "$studyID"

    # test 11 (-i, but the id is not in our database)
    echo -e "Test 11-- -f $i -o $outputFolder/test11${fileType}.tsv -c $pvalue -r $refGen -p $pop -i GCST000003"
    echo -e "Test 11-- -f $i -o $outputFolder/test11${fileType}.tsv -c $pvalue -r $refGen -p $pop -i GCST000003" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test11${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "GCST000003"

    # test 12 (2 study IDs using -i)
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 12-- -f $i -o $outputFolder/test12${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID1 -i $studyID2"
    echo -e "Test 12-- -f $i -o $outputFolder/test12${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID1 -i $studyID2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test12${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "$studyID1" -i "$studyID2"

    # TODO test 13 (test 10 without internet)

    # test 14 (-e)
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 14-- -f $i -o $outputFolder/test14${fileType}.tsv -c $pvalue -r $refGen -p $pop -e $ethnicity"
    echo -e "Test 14-- -f $i -o $outputFolder/test14${fileType}.tsv -c $pvalue -r $refGen -p $pop -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test14${fileType}.tsv" -c $pvalue -r $refGen -p $pop -e "$ethnicity"

    # test 15 (2 ethnicities using -e)
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})
    
    echo -e "Test 15-- -f $i -o $outputFolder/test15${fileType}.tsv -c $pvalue -r $refGen -p $pop -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 15-- -f $i -o $outputFolder/test15${fileType}.tsv -c $pvalue -r $refGen -p $pop -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test15${fileType}.tsv" -c $pvalue -r $refGen -p $pop -e "$ethnicity1" -e "$ethnicity2"

    # TODO test 16 (test 14 without internet)

    # test 17 (-v)
    echo -e "Test 17-- -f $i -o $outputFolder/test17${fileType}.tsv -c $pvalue -r $refGen -p $pop -v"
    echo -e "Test 17-- -f $i -o $outputFolder/test17${fileType}.tsv -c $pvalue -r $refGen -p $pop -v" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test17${fileType}.tsv" -c $pvalue -r $refGen -p $pop -v

    # TODO test 18 (test 17 without internet)

    # test 19 (-g)
    echo -e "Test 19-- -f $i -o $outputFolder/test19${fileType}.tsv -c $pvalue -r $refGen -p $pop -g Male"
    echo -e "Test 19-- -f $i -o $outputFolder/test19${fileType}.tsv -c $pvalue -r $refGen -p $pop -g Male" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test19${fileType}.tsv" -c $pvalue -r $refGen -p $pop -g "Male"

    # TODO test 20 (test 19 without internet)

    # test 21 (-s)
    echo -e "Test 21a-- -f $i -o $outputFolder/test21a${fileType}.tsv -c $pvalue -r $refGen -p $pop -s 2"
    echo -e "Test 21a-- -f $i -o $outputFolder/test21a${fileType}.tsv -c $pvalue -r $refGen -p $pop -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -s "2"

    echo -e "Test 21b-- -f $i -o $outputFolder/test21b${fileType}.tsv -c $pvalue -r $refGen -p $pop -s 1&2"
    echo -e "Test 21b-- -f $i -o $outputFolder/test21b${fileType}.tsv -c $pvalue -r $refGen -p $pop -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -s "2"

    # TODO test 22 (test 21 without internet)


    # test 23 (-t, -k)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})

    echo -e "Test 23-- -f $i -o $outputFolder/test23${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType"
    echo -e "Test 23-- -f $i -o $outputFolder/test23${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test23${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType"

    # test 24 (-t x2, -k x2)
    trait1=$(getRandomElement ${validTraits[@]})
    trait2=$(getRandomElement ${validTraits[@]})
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})

    echo -e "Test 24-- -f $i -o $outputFolder/test24${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 - t $trait2 -k $studyType1 -k $studyType2"
    echo -e "Test 24-- -f $i -o $outputFolder/test24${fileType}.tsv-c $pvalue -r $refGen -p $pop -t $trait1 - t $trait2 -k $studyType1 -k $studyType2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test24${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait1" - t "$trait2" -k "$studyType1" -k "$studyType2"

    # test 25 (-t, -k, -s)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})

    echo -e "Test 25a-- -f $i -o $outputFolder/test25a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -s 2"
    echo -e "Test 25a-- -f $i -o $outputFolder/test25a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -s "2"

    echo -e "Test 25b-- -f $i -o $outputFolder/test25b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -s 1&2"
    echo -e "Test 25b-- -f $i -o $outputFolder/test25b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -s "2"

    # TODO test 26 (test 23 without internet)


    # test 27 (-t, -i)
    trait=$(getRandomElement ${validTraits[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 27-- -f $i -o $outputFolder/test27${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID"
    echo -e "Test 27-- -f $i -o $outputFolder/test27${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test27${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID"

    # test 28 (-t x2, -i x2)
    trait1=$(getRandomElement ${validTraits[@]})
    trait2=$(getRandomElement ${validTraits[@]})
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 28-- -f $i -o $outputFolder/test28${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -i $studyID1 -i $studyID2"
    echo -e "Test 28-- -f $i -o $outputFolder/test28${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -i $studyID1 -i $studyID2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test28${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait1" -t "$trait2" -i "$studyID1" -i "$studyID2"

    # test 29 (-t, -i, -s)
    trait=$(getRandomElement ${validTraits[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 29a-- -f $i -o $outputFolder/test29a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -s 2"
    echo -e "Test 29a-- -f $i -o $outputFolder/test29a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID" -s "2"

    echo -e "Test 29b-- -f $i -o $outputFolder/test29b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -s 1&2"
    echo -e "Test 29b-- -f $i -o $outputFolder/test29b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID" -s "2"

    # TODO test 30 (test 27 without internet)

    # test 31 (-k, -e)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 31-- -f $i -o $outputFolder/test31${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity"
    echo -e "Test 31-- -f $i -o $outputFolder/test31${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test31${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -e "$ethnicity"

    # test 32 (-k x2, -e x2)
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 32-- -f $i -o $outputFolder/test32${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 32-- -f $i -o $outputFolder/test32${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test32${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType1" -k "$studyType2" -e "$ethnicity1" -e "$ethnicity2"

    # test 33 (-k, -e, -s)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 33a-- -f $i -o $outputFolder/test33a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 2"
    echo -e "Test 33a-- -f $i -o $outputFolder/test33a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -e "$ethnicity" -s "2"

    echo -e "Test 33b-- -f $i -o $outputFolder/test33b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 1&2"
    echo -e "Test 33b-- -f $i -o $outputFolder/test33b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -e "$ethnicity" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -e "$ethnicity" -s "2"

    # TODO test 34 (test 31 without internet)

    # test 35 (-k, -i)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 35-- -f $i -o $outputFolder/test35${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID"
    echo -e "Test 35-- -f $i -o $outputFolder/test35${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test35${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID"

    # test 36 (-k x2, -i x2)
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 36-- -f $i -o $outputFolder/test36${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -i $studyID1 -i $studyID2"
    echo -e "Test 36-- -f $i -o $outputFolder/test36${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -i $studyID1 -i $studyID2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test36${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType1" -k "$studyType2" -i "$studyID1" -i "$studyID2"

    # test 37 (-k, -i, -s)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 37a-- -f $i -o $outputFolder/test37a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -s 2"
    echo -e "Test 37a-- -f $i -o $outputFolder/test37a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID" -s "2"

    echo -e "Test 37b-- -f $i -o $outputFolder/test37b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -s 1&2"
    echo -e "Test 37b-- -f $i -o $outputFolder/test37b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID" -s "2"

    # TODO test 38 (test 35 without internet)

    # test 39 (-k, -e)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 39-- -f $i -o $outputFolder/test39${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity"
    echo -e "Test 39-- -f $i -o $outputFolder/test39${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test39${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -e "$ethnicity"

    # test 40 (-k x2, -e x2)
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 40-- -f $i -o $outputFolder/test40${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 40-- -f $i -o $outputFolder/test40${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test40${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType1" -k "$studyType2" -e "$ethnicity1" -e "$ethnicity2"

    # test 41 (-k, -e, -s)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 41a-- -f $i -o $outputFolder/test41a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 2"
    echo -e "Test 41a-- -f $i -o $outputFolder/test41a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -e "$ethnicity" -s "2"

    echo -e "Test 41b-- -f $i -o $outputFolder/test41b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 1&2"
    echo -e "Test 41b-- -f $i -o $outputFolder/test41b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -e $ethnicity -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -e "$ethnicity" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -e "South Asian" -s "2"

    # TODO test 42 (test 39 without internet)

    # test 43 (-i, -e)
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 43-- -f $i -o $outputFolder/test43${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID -e $ethnicity"
    echo -e "Test 43-- -f $i -o $outputFolder/test43${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test43${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "$studyID" -e "$ethnicity"

    # test 44 (-i x2, -e x2)
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 44-- -f $i -o $outputFolder/test44${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 44-- -f $i -o $outputFolder/test44${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test44${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "$studyID1" -i "$studyID2" -e "$ethnicity1" -e "$ethnicity2"

    # test 45 (-i, -e, -s)
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 45a-- -f $i -o $outputFolder/test45a${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID -e $ethnicity -s 2"
    echo -e "Test 45a-- -f $i -o $outputFolder/test45a${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID -e $ethnicity -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "$studyID" -e "$ethnicity" -s "2"

    echo -e "Test 45b-- -f $i -o $outputFolder/test45b${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID -e $ethnicity -s 1&2"
    echo -e "Test 45b-- -f $i -o $outputFolder/test45b${fileType}.tsv -c $pvalue -r $refGen -p $pop -i $studyID -e $ethnicity -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "$studyID" -e "$ethnicity" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "$studyID" -e "$ethnicity" -s "2"

    # TODO test 46 (test 43 without internet)

    # test 47 (-t, -k, -i)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 47-- -f $i -o $outputFolder/test47${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID"
    echo -e "Test 47-- -f $i -o $outputFolder/test47${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test47${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID"

    # test 48 (-t x2, -k x2, -i x2)
    trait1=$(getRandomElement ${validTraits[@]})
    trait2=$(getRandomElement ${validTraits[@]})
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 48-- -f $i -o $outputFolder/test48${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -k $studyType1 -k $studyType2 -i $studyID1 -e $studyID2"
    echo -e "Test 48-- -f $i -o $outputFolder/test48${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -k $studyType1 -k $studyType2 -i $studyID1 -e $studyID2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test48${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait1" -t "$trait2" -k "$studyType1" -k "$studyType2" -i "$studyID1" -e "$studyID2"

    # test 49 (-t, -k, -i, -s)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})

    echo -e "Test 49a-- -f $i -o $outputFolder/test49a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -s 2"
    echo -e "Test 49a-- -f $i -o $outputFolder/test49a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test49a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -s "2"

    echo -e "Test 49b-- -f $i -o $outputFolder/test49b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -s 1&2" 
    echo -e "Test 49b-- -f $i -o $outputFolder/test49b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test49b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test49b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -s "2"

    # TODO test 50 (test 47 without internet)

    # test 51 (-t, -k, -e)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 51-- -f $i -o $outputFolder/test51${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -e $ethnicity"
    echo -e "Test 51-- -f $i -o $outputFolder/test51${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test51${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -e "$ethnicity"

    # test 52 (-t x2, -k x2, -e x2)
    trait1=$(getRandomElement ${validTraits[@]})
    trait2=$(getRandomElement ${validTraits[@]})
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 52-- -f $i -o $outputFolder/test52${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -k $studyType1 -k $studyType2 -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 52-- -f $i -o $outputFolder/test52${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -k $studyType1 -k $studyType2 -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test52${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait1" -t "$trait2" -k "$studyType1" -k "$studyType2" -e "$ethnicity1" -e "$ethnicity2"

    # test 53 (-t, -k, -e, -s)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 53a-- -f $i -o $outputFolder/test53a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -e $ethnicity -s 2"
    echo -e "Test 53a-- -f $i -o $outputFolder/test53a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -e $ethnicity -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test53a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -e "$ethnicity" -s "2"

    echo -e "Test 53b-- -f $i -o $outputFolder/test53b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -e $ethnicity -s 1&2"
    echo -e "Test 53b-- -f $i -o $outputFolder/test53b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -e $ethnicity -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test53b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -e "$ethnicity" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test53b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -e "$ethnicity" -s "2"

    # TODO test 54 (test 51 without internet)

    # test 55 (-t, -i, -e)
    trait=$(getRandomElement ${validTraits[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 55-- -f $i -o $outputFolder/test55${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -e $ethnicity"
    echo -e "Test 55-- -f $i -o $outputFolder/test55${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test55${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID" -e "$ethnicity"

    # test 56 (-t x2, -i x2, -e x2)
    trait1=$(getRandomElement ${validTraits[@]})
    trait2=$(getRandomElement ${validTraits[@]})
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 56-- -f $i -o $outputFolder/test56${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 56-- -f $i -o $outputFolder/test56${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test56${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait1" -t "$trait2" -i "$studyID1" -i "$studyID2" -e "$ethnicity1" -e "$ethnicity2"

    # test 57 (-t, -i, -e, -s)
    trait=$(getRandomElement ${validTraits[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 57a-- -f $i -o $outputFolder/test57a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -e $ethnicity -s 2"
    echo -e "Test 57a-- -f $i -o $outputFolder/test57a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -e $ethnicity -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test57a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID" -e "$ethnicity" -s "2"

    echo -e "Test 57b-- -f $i -o $outputFolder/test57b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -e $ethnicity -s 1&2"
    echo -e "Test 57b-- -f $i -o $outputFolder/test57b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -i $studyID -e $ethnicity -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test57b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID" -e "$ethnicity" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test57b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -i "$studyID" -e "$ethnicity" -s "2"

    # TODO test 58 (test 55 without internet)

    # test 59 (-k, -i, -e)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 59-- -f $i -o $outputFolder/test59${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -e $ethnicity"
    echo -e "Test 59-- -f $i -o $outputFolder/test59${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test59${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID" -e "$ethnicity"

    # test 60 (-k x2, -i x2, -e x2)
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 60-- -f $i -o $outputFolder/test60${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 60-- -f $i -o $outputFolder/test60${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType1 -k $studyType2 -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test60${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType1" -k "$studyType2" -i "$studyID1" -i "$studyID2" -e "$ethnicity1" -e "$ethnicity2"

    # test 61 (-k, -i, -e, -s)
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 61a-- -f $i -o $outputFolder/test61a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -e $ethnicity -s 2"
    echo -e "Test 61a-- -f $i -o $outputFolder/test61a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -e $ethnicity -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test61a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID" -e "$ethnicity" -s "2"

    echo -e "Test 61b-- -f $i -o $outputFolder/test61b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -e $ethnicity -s 1&2"
    echo -e "Test 61b-- -f $i -o $outputFolder/test61b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k $studyType -i $studyID -e $ethnicity -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test61b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID" -e "$ethnicity" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test61b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "$studyType" -i "$studyID" -e "$ethnicity" -s "2"

    # TODO test 62 (test 59 without internet)

    # test 63 (-t, -k, -i, -e)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 63-- -f $i -o $outputFolder/test63${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e $ethnicity" 
    echo -e "Test 63-- -f $i -o $outputFolder/test63${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e $ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test63${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "$ethnicity"

    # test 64 (-t x2, -k x2, -i x2, -e x2)
    trait1=$(getRandomElement ${validTraits[@]})
    trait2=$(getRandomElement ${validTraits[@]})
    studyType1=$(getRandomElement ${validStudyTypes[@]})
    studyType2=$(getRandomElement ${validStudyTypes[@]})
    studyID1=$(getRandomElement ${validStudyIDs[@]})
    studyID2=$(getRandomElement ${validStudyIDs[@]})
    ethnicity1=$(getRandomElement ${validEthnicities[@]})
    ethnicity2=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 64-- -f $i -o $outputFolder/test64${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -k $studyType1 -k $studyType2 -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2"
    echo -e "Test 64-- -f $i -o $outputFolder/test64${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait1 -t $trait2 -k $studyType1 -k $studyType2 -i $studyID1 -i $studyID2 -e $ethnicity1 -e $ethnicity2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test64${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait1" -t "$trait2" -k "$studyType1" -k "$studyType2" -i "$studyID1" -i "$studyID2" -e "$ethnicity1" -e "$ethnicity2"

    # test 65 (-t, -k, -i, -e, -s)
    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    ethnicity=$(getRandomElement ${validEthnicities[@]})

    echo -e "Test 65a-- -f $i -o $outputFolder/test65a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e $ethnicity -s 2"
    echo -e "Test 65a-- -f $i -o $outputFolder/test65a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e $ethnicity -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test65a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "$ethnicity" -s "2"

    echo -e "Test b-- -f $i -o $outputFolder/test65b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e $ethnicity -s 1&2" 
    echo -e "Test b-- -f $i -o $outputFolder/test65b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e $ethnicity -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test65b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "$ethnicity" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test65b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "$ethnicity" -s "2"

    # TODO test 66 (test 63 without internet)

    #####################TESTING BAD PARAMETERS#####################

    # test 67 (bad -t)
    echo -e "Test 67-- -f $i -o $outputFolder/test67${fileType}.tsv -c $pvalue -r $refGen -p $pop -t 'pink'"
    echo -e "Test 67-- -f $i -o $outputFolder/test67${fileType}.tsv -c $pvalue -r $refGen -p $pop -t 'pink'" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test67${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t 'pink'

    # test 68 (test 67 without internet)
    # echo -e "Test 68-- -f $i -o $outputFolder/test68${fileType}.tsv -c $pvalue -r $refGen -p $pop -t 'pink'"
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test68${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t 'pink'

    # test 69 (bad -k)
    echo -e "Test 69-- -f $i -o $outputFolder/test69${fileType}.tsv -c $pvalue -r $refGen -p $pop -k 'HE'"
    echo -e "Test 69-- -f $i -o $outputFolder/test69${fileType}.tsv -c $pvalue -r $refGen -p $pop -k 'HE'" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test69${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k 'HE'

    # test 70 (test 69 without internet)
    # echo -e "Test 70-- -f $i -o $outputFolder/test70${fileType}.tsv -c $pvalue -r $refGen -p $pop -k 'HE'"
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test70${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k 'HE'

    # test 71 (bad -i)
    echo -e "Test 71-- -f $i -o $outputFolder/test71${fileType}.tsv -c $pvalue -r $refGen -p $pop -i 'GCST'"
    echo -e "Test 71-- -f $i -o $outputFolder/test71${fileType}.tsv -c $pvalue -r $refGen -p $pop -i 'GCST'" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test71${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "GCST"

    # test 72 (test 71 without internet)
    # echo -e "Test 72-- -f $i -o $outputFolder/test72${fileType}.tsv -c $pvalue -r $refGen -p $pop -i "GCST""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test72${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "GCST"

    # test 73 (bad -e)
    echo -e "Test 73-- -f $i -o $outputFolder/test73${fileType}.tsv -c $pvalue -r $refGen -p $pop -e Not ethnicity"
    echo -e "Test 73-- -f $i -o $outputFolder/test73${fileType}.tsv -c $pvalue -r $refGen -p $pop -e Not ethnicity" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test73${fileType}.tsv" -c $pvalue -r $refGen -p $pop -e "Not ethnicity"

    # test 74 (test 73 without internet)
    # echo -e "Test 74-- -f $i -o $outputFolder/test74${fileType}.tsv -c $pvalue -r $refGen -p $pop -e "Not ethnicity""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test74${fileType}.tsv" -c $pvalue -r $refGen -p $pop -e "Not ethnicity"

    # test 75 (bad -v)
    echo -e "Test 75-- -f $i -o $outputFolder/test75${fileType}.tsv -c $pvalue -r $refGen -p $pop -v"
    echo -e "Test 75-- -f $i -o $outputFolder/test75${fileType}.tsv -c $pvalue -r $refGen -p $pop -v" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test75${fileType}.tsv" -c $pvalue -r $refGen -p $pop -v

    # test 76 (test 75 without internet)
    # echo -e "Test 76-- -f $i -o $outputFolder/test76${fileType}.tsv -c $pvalue -r $refGen -p $pop -v"
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test76${fileType}.tsv" -c $pvalue -r $refGen -p $pop -v

    # test 77 (bad -g)
    echo -e "Test 77-- -f $i -o $outputFolder/test77${fileType}.tsv -c $pvalue -r $refGen -p $pop -g he"
    echo -e "Test 77-- -f $i -o $outputFolder/test77${fileType}.tsv -c $pvalue -r $refGen -p $pop -g he" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test77${fileType}.tsv" -c $pvalue -r $refGen -p $pop -g "he"

    # test 78 (test 77 without internet)
    # echo -e "Test 78-- -f $i -o $outputFolder/test78${fileType}.tsv -c $pvalue -r $refGen -p $pop -g "he""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test78${fileType}.tsv" -c $pvalue -r $refGen -p $pop -g "he"

    # test 79 (bad -s)
    echo -e "Test 79-- -f $i -o $outputFolder/test79${fileType}.tsv -c $pvalue -r $refGen -p $pop -s he"
    echo -e "Test 79-- -f $i -o $outputFolder/test79${fileType}.tsv -c $pvalue -r $refGen -p $pop -s he" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test79${fileType}.tsv" -c $pvalue -r $refGen -p $pop -s "he"

    # test 80 (test 79 without internet)
    # echo -e "Test 80-- -f $i -o $outputFolder/test80${fileType}.tsv -c $pvalue -r $refGen -p $pop -s "he""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test80${fileType}.tsv" -c $pvalue -r $refGen -p $pop -s "he"

    # test 81 (bad -t and -k)
    echo -e "Test 81-- -f $i -o $outputFolder/test81${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -k HW"
    echo -e "Test 81-- -f $i -o $outputFolder/test81${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -k HW" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test81${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW"

    # test 82 (test 81 with -s)
    echo -e "Test 82a-- -f $i -o $outputFolder/test82a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -k HW -s 2"
    echo -e "Test 82a-- -f $i -o $outputFolder/test82a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -k HW -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test82a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW" -s "2"

    echo -e "Test 82b-- -f $i -o $outputFolder/test82b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -k HW -s 1&2"
    echo -e "Test 82b-- -f $i -o $outputFolder/test82b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -k HW -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test82b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test82b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW" -s "2"

    # test 83 (test 81 without internet)
    # echo -e "Test 83-- -f $i -o $outputFolder/test83${fileType}.tsv -c $pvalue -r $refGen -p $pop -t "pink" -k "HW""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test83${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW"

    # test 84 (bad -t and -i)
    echo -e "Test 84-- -f $i -o $outputFolder/test84${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -i GCST"
    echo -e "Test 84-- -f $i -o $outputFolder/test84${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -i GCST" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test84${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST"

    # test 85 (test 84 with -s)
    echo -e "Test 85a-- -f $i -o $outputFolder/test85a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -i GCST -s 2"
    echo -e "Test 85a-- -f $i -o $outputFolder/test85a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -i GCST -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test85a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST" -s "2"


    echo -e "Test 85b-- -f $i -o $outputFolder/test85b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -i GCST -s 1&2"
    echo -e "Test 85b-- -f $i -o $outputFolder/test85b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -i GCST -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test85b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test85b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST" -s "2"

    # test 86 (test 84 without internet)
    # echo -e "Test 86-- -f $i -o $outputFolder/test86${fileType}.tsv -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test86${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST"

    # test 87 (bad -t and -e)
    echo -e "Test 87-- -f $i -o $outputFolder/test87${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -e europ"
    echo -e "Test 87-- -f $i -o $outputFolder/test87${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -e europ" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test87${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ"

    # test 88 (test 87 with -s)
    echo -e "Test 88a-- -f $i -o $outputFolder/test88a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -e europ -s 2"
    echo -e "Test 88a-- -f $i -o $outputFolder/test88a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -e europ -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test88a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ" -s "2"


    echo -e "Test 88b-- -f $i -o $outputFolder/test88b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -e europ -s 1&2"
    echo -e "Test 88b-- -f $i -o $outputFolder/test88b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t pink -e europ -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test88b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test88b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ" -s "2"

    # test 89 (test 87 without internet)
    # echo -e "Test 89-- -f $i -o $outputFolder/test89${fileType}.tsv -c $pvalue -r $refGen -p $pop -t "pink" -e "europ""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test89${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ"

    # test 90 (bad -k and -i)
    echo -e "Test 90-- -f $i -o $outputFolder/test90${fileType}.tsv -c $pvalue -r $refGen -p $pop -k Hi -i GCST"
    echo -e "Test 90-- -f $i -o $outputFolder/test90${fileType}.tsv -c $pvalue -r $refGen -p $pop -k Hi -i GCST" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test90${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "Hi" -i "GCST"

    # test 91 (test 90 with -s)
    echo -e "Test 91a-- -f $i -o $outputFolder/test91a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k Ho -i gcst -s 2"
    echo -e "Test 91a-- -f $i -o $outputFolder/test91a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k Ho -i gcst -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test91a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "Ho" -i "gcst" -s "2"


    echo -e "Test 91b-- -f $i -o $outputFolder/test91b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k Ho -i gcst -s 1&2"
    echo -e "Test 91b-- -f $i -o $outputFolder/test91b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k Ho -i gcst -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test91b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "Ho" -i "gcst" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test91b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "Ho" -i "gcst" -s "2"

    # test 92 (test 90 without internet)
    # echo -e "Test 92-- -f $i -o $outputFolder/test92${fileType}.tsv -c $pvalue -r $refGen -p $pop -k "Hi" -i "GCST""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test92${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "Hi" -i "GCST"

    # test 93 (bad -k and -e)
    echo -e "Test 93-- -f $i -o $outputFolder/test93${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -e bogus"
    echo -e "Test 93-- -f $i -o $outputFolder/test93${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -e bogus" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test93${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus"

    # test 94 (test 93 with -s)
    echo -e "Test 94a-- -f $i -o $outputFolder/test94a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -e bogus -s 2"
    echo -e "Test 94a-- -f $i -o $outputFolder/test94a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -e bogus -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test94a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus" -s "2"


    echo -e "Test 94b-- -f $i -o $outputFolder/test94b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -e bogus -s 1&2"
    echo -e "Test 94b-- -f $i -o $outputFolder/test94b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -e bogus -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test94b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test94b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus" -s "2"

    # test 95 (test 93 without internet)
    # echo -e "Test 95-- -f $i -o $outputFolder/test95${fileType}.tsv -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test95${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus"

    # test 96 (bad -i and -e)
    echo -e "Test 96-- -f $i -o $outputFolder/test96${fileType}.tsv -c $pvalue -r $refGen -p $pop -i gcst -e bogus"
    echo -e "Test 96-- -f $i -o $outputFolder/test96${fileType}.tsv -c $pvalue -r $refGen -p $pop -i gcst -e bogus" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test96${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus"

    # test 97 (test 96 with -s)
    echo -e "Test 97a-- -f $i -o $outputFolder/test97a${fileType}.tsv -c $pvalue -r $refGen -p $pop -i gcst -e bogus -s 2"
    echo -e "Test 97a-- -f $i -o $outputFolder/test97a${fileType}.tsv -c $pvalue -r $refGen -p $pop -i gcst -e bogus -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test97a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus" -s "2"


    echo -e "Test 97b-- -f $i -o $outputFolder/test97b${fileType}.tsv -c $pvalue -r $refGen -p $pop -i gcst -e bogus -s 1&2"
    echo -e "Test 97b-- -f $i -o $outputFolder/test97b${fileType}.tsv -c $pvalue -r $refGen -p $pop -i gcst -e bogus -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test97b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test97b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus" -s "2"

    # test 98 (test 96 without internet)
    # echo -e "Test 98-- -f $i -o $outputFolder/test98${fileType}.tsv -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test98${fileType}.tsv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus"

    # test 99 (bad -t, -k, and -i)
    echo -e "Test 99-- -f $i -o $outputFolder/test99${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -i gcst"
    echo -e "Test 99-- -f $i -o $outputFolder/test99${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -i gcst" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test99${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst"

    # test 100 (test 99 with -s)
    echo -e "Test 100a-- -f $i -o $outputFolder/test100a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -i gcst -s 2"
    echo -e "Test 100a-- -f $i -o $outputFolder/test100a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -i gcst -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test100a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst" -s "2"


    echo -e "Test 100b-- -f $i -o $outputFolder/test100b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -i gcst -s 1&2"
    echo -e "Test 100b-- -f $i -o $outputFolder/test100b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -i gcst -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test100b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test100b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst" -s "2"

    # test 101 (test 99 without internet)
    # echo -e "Test 101-- -f $i -o $outputFolder/test101${fileType}.tsv -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test101${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst"

    # test 102 (bad -t, -k, and -e)
    echo -e "Test 102-- -f $i -o $outputFolder/test102${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -e bogus"
    echo -e "Test 102-- -f $i -o $outputFolder/test102${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -e bogus" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test102${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus"

    # test 103 (test 102 with -s)
    echo -e "Test 103a-- -f $i -o $outputFolder/test103a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -e bogus -s 2"
    echo -e "Test 103a-- -f $i -o $outputFolder/test103a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -e bogus -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test103a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus" -s "2"


    echo -e "Test 103b-- -f $i -o $outputFolder/test103b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -e bogus -s 1&2"
    echo -e "Test 103b-- -f $i -o $outputFolder/test103b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -k HI -e bogus -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test103b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test103b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus" -s "2"

    # test 104 (test 102 without internet)
    # echo -e "Test 104-- -f $i -o $outputFolder/test104${fileType}.tsv -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test104${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus"

    # test 105 (bad -t, -i, and -e)
    echo -e "Test 105-- -f $i -o $outputFolder/test105${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -i gcst -e bogus"
    echo -e "Test 105-- -f $i -o $outputFolder/test105${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -i gcst -e bogus" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test105${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus"

    # test 106 (test 105 with -s)
    echo -e "Test 106a-- -f $i -o $outputFolder/test106a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -i gcst -e bogus -s 2"
    echo -e "Test 106a-- -f $i -o $outputFolder/test106a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -i gcst -e bogus -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test106a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus" -s "2"


    echo -e "Test 106b-- -f $i -o $outputFolder/test106b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -i gcst -e bogus -s 1&2"
    echo -e "Test 106b-- -f $i -o $outputFolder/test106b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t flubber -i gcst -e bogus -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test106b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test106b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus" -s "2"

    # test 107 (test 105 without internet)
    # echo -e "Test 107-- -f $i -o $outputFolder/test107${fileType}.tsv -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test107${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus"

    # test 108 (bad -k, -i, and -e)
    echo -e "Test 108-- -f $i -o $outputFolder/test108${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -i gcst -e bogus"
    echo -e "Test 108-- -f $i -o $outputFolder/test108${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -i gcst -e bogus" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test108${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus"

    # test 109 (test 108 with -s)
    echo -e "Test 109a-- -f $i -o $outputFolder/test109a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -i gcst -e bogus -s 2"
    echo -e "Test 109a-- -f $i -o $outputFolder/test109a${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -i gcst -e bogus -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test109a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "2"

    echo -e "Test 109b-- -f $i -o $outputFolder/test109b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -i gcst -e bogus -s 1&2"
    echo -e "Test 109b-- -f $i -o $outputFolder/test109b${fileType}.tsv -c $pvalue -r $refGen -p $pop -k HI -i gcst -e bogus -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test109b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test109b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "2"

    # test 110 (test 108 without internet)
    # echo -e "Test 110-- -f $i -o $outputFolder/test110${fileType}.tsv -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test110${fileType}.tsv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus"

    # test 111 (bad -t, -k, -i, and -e)
    echo -e "Test 111-- -f $i -o $outputFolder/test111${fileType}.tsv -c $pvalue -r $refGen -p $pop -t yeet -k HI -i gcst -e bogus"
    echo -e "Test 111-- -f $i -o $outputFolder/test111${fileType}.tsv -c $pvalue -r $refGen -p $pop -t yeet -k HI -i gcst -e bogus" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test111${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus"

    # test 112 (test 111 with -s)
    echo -e "Test 112a-- -f $i -o $outputFolder/test112a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t yeet -k HI -i gcst -e bogus -s 2"
    echo -e "Test 112a-- -f $i -o $outputFolder/test112a${fileType}.tsv -c $pvalue -r $refGen -p $pop -t yeet -k HI -i gcst -e bogus -s 2" > $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test112a${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "2"


    echo -e "Test 112b-- -f $i -o $outputFolder/test112b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t yeet -k HI -i gcst -e bogus -s 1&2"
    echo -e "Test 112b-- -f $i -o $outputFolder/test112b${fileType}.tsv -c $pvalue -r $refGen -p $pop -t yeet -k HI -i gcst -e bogus -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test112b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test112b${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "2"

    # test 113 (test 111 without internet)
    # echo -e "Test 113-- -f $i -o $outputFolder/test113${fileType}.tsv -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus""
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test113${fileType}.tsv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus"

    # test 114 (bad -f)
    echo -e "Test 114-- -f ../savcf -o $outputFolder/test114${fileType}.tsv -c $pvalue -r $refGen -p $pop"
    echo -e "Test 114-- -f ../savcf -o $outputFolder/test114${fileType}.tsv -c $pvalue -r $refGen -p $pop" >> $outputDetails
    ./runPrsCLI.sh -f "../savcf" -o "$outputFolder/test114${fileType}.tsv" -c $pvalue -r $refGen -p $pop

    # test 115 (test 114 without internet)
    # echo -e "Test 115-- -f ../savcf -o $outputFolder/test115${fileType}.tsv -c $pvalue -r $refGen -p $pop"
    # ./runPrsCLI.sh -f "../savcf" -o "$outputFolder/test115${fileType}.tsv" -c $pvalue -r $refGen -p $pop 

    # test 116 (bad -o)
    echo -e "Test 116-- -f $i -o output.hem -c $pvalue -r $refGen -p $pop"
    echo -e "Test 116-- -f $i -o output.hem -c $pvalue -r $refGen -p $pop" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "output.hem" -c $pvalue -r $refGen -p $pop 

    # test 117 (test 116 without internet)
    # echo -e "Test 117-- -f $i -o output.hem -c $pvalue -r $refGen -p $pop"
    # ./runPrsCLI.sh -f $i -o "output.hem" -c $pvalue -r $refGen -p $pop 

    # test 118 (bad -r)
    echo -e "Test 118-- -f $i -o $outputFolder/test118${fileType}.tsv -c $pvalue -r hg1997 -p $pop"
    echo -e "Test 118-- -f $i -o $outputFolder/test118${fileType}.tsv -c $pvalue -r hg1997 -p $pop" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test118${fileType}.tsv" -c $pvalue -r "hg1997" -p $pop

    # test 119 (test 118 without internet)
    # echo -e "Test 119-- -f $i -o $outputFolder/test119${fileType}.tsv -c $pvalue -r hg1997 -p $pop"
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test119${fileType}.tsv" -c $pvalue -r "hg1997" -p $pop

    # test 120 (bad -c)
    echo -e "Test 120-- -f $i -o $outputFolder/test120${fileType}.tsv -c lala -r $refGen -p $pop"
    echo -e "Test 120-- -f $i -o $outputFolder/test120${fileType}.tsv -c lala -r $refGen -p $pop" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test120${fileType}.tsv" -c "lala" -r $refGen -p $pop

    # test 121 (test 120 without internet)
    # echo -e "Test 121-- -f $i -o $outputFolder/test121${fileType}.tsv -c lala -r $refGen -p $pop"
    # ./runPrsCLI.sh -f $i -o "$soutputFolder/test121${fileType}.tsv" -c "lala" -r $refGen -p $pop

    # test 122 (bad -p)
    echo -e "Test 122-- -f $i -o $outputFolder/test122${fileType}.tsv -c $pvalue -r $refGen -p FIF"
    echo -e "Test 122-- -f $i -o $outputFolder/test122${fileType}.tsv -c $pvalue -r $refGen -p FIF" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test122${fileType}.tsv" -c $pvalue -r $refGen -p "FIF"

    # test 123 (test 122 without internet)
    # echo -e "Test 123-- -f $i -o $outputFolder/test123${fileType}.tsv -c $pvalue -r $refGen -p FIF"
    # ./runPrsCLI.sh -f $i -o "$outputFolder/test123${fileType}.tsv" -c $pvalue -r $refGen -p "FIF"
done

