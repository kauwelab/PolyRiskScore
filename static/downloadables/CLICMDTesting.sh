
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
validStudyIDs=($(curl -s https://prs.byu.edu/get_all_studies | jq -r 'sort_by(.studyID) | .[] | .studyID'))

getRandomElement () {
    array=($@)
    let len=${#array[@]}-1
    index=$(awk -v min=0 -v max=${len} 'BEGIN{srand(); print int(min+rand()*(max-min+1))}')
    returnVal=$(echo ${array[$index]} | tr -s '_' ' ')
    echo ${returnVal}
}

echo "Preparation finished."


#TODO should we test multiple populations or refgens?

for i in "../sample.vcf" "../sample.txt"; do #TODO - we will need to add in the output files txt or vcf depending

    # test 0 (test the basic required parameters. If this fails, we're in trouble!)
    echo -e "Test 0-- -f $i -o $outputFolder/test0.csv -c $pvalue -r $refGen -p $pop" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test0.csv" -c $pvalue -r $refGen -p $pop

    # test 1 (-t -k -i -e -v -g -s)
    echo -e "Test 1a-- -f $i -o $outputFolder/test1a.csv -c $pvalue -r $refGen -p $pop -t acne -k HI -i GCST007234 -e european -v true -g f -s 2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1a.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "HI" -i "GCST007234" -e "european" -v 'true' -g "f" -s "2"

    trait=$(getRandomElement ${validTraits[@]})
    studyType=$(getRandomElement ${validStudyTypes[@]})
    studyID=$(getRandomElement ${validStudyIDs[@]})
    
    echo -e "Test 1b-- -f $i -o $outputFolder/test1b.csv -c $pvalue -r $refGen -p $pop -t $trait -k $studyType -i $studyID -e european -v true -g Male -s 1&2" >> $outputDetails
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1b.csv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "european" -v 'true' -g "Male" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1b.csv" -c $pvalue -r $refGen -p $pop -t "$trait" -k "$studyType" -i "$studyID" -e "european" -v 'true' -g "Male" -s "2"

    # TODO test 2 (test 1 but without internet)


    # test 3 (-t)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test3.csv" -c $pvalue -r $refGen -p $pop -t "Asthma"

    # test 4 (-t again)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test4.csv" -c $pvalue -r $refGen -p $pop -t "Alzheimer's Disease"

    # test 5 (2 traits using -t)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test5.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -t "insomnia"

    # TODO test 6 (test 3 without internet)

    # test 7 (-k)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test7.csv" -c $pvalue -r $refGen -p $pop -k "LC"

    # test 8 (2 study types using -k)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test8.csv" -c $pvalue -r $refGen -p $pop -k "LC" -k "O"

    # TODO test 9 (test 7 without internet)

    # test 10 (-i)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test10.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001"

    # test 11 (-i, but the id is not in our database)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test11.csv" -c $pvalue -r $refGen -p $pop -i "GCST000003"

    # test 12 (2 study IDs using -i)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test12.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -i "GCST000010"

    # TODO test 13 (test 10 without internet)

    # test 14 (-e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test14.csv" -c $pvalue -r $refGen -p $pop -e "East Asian"

    # test 15 (2 ethnicities using -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test15.csv" -c $pvalue -r $refGen -p $pop -e "East Asian" -e "european"

    # TODO test 16 (test 14 without internet)

    # test 17 (-v)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test17.csv" -c $pvalue -r $refGen -p $pop -v "true"

    # TODO test 18 (test 17 without internet)

    # test 19 (-g)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test19.csv" -c $pvalue -r $refGen -p $pop -g "Male"

    # TODO test 20 (test 19 without internet)

    # test 21 (-s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21.csv" -c $pvalue -r $refGen -p $pop -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21v2.csv" -c $pvalue -r $refGen -p $pop -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21v2.csv" -c $pvalue -r $refGen -p $pop -s "2"

    # TODO test 22 (test 21 without internet)

    # test 23 (-t, -k)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test23.csv" -c $pvalue -r $refGen -p $pop -t "Insomnia" -k "LC"

    # test 24 (-t x2, -k x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test24.csv" -c $pvalue -r $refGen -p $pop -t "Insomnia" - t "acne" -k "HI" -k "O"

    # test 25 (-t, -k, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25.csv" -c $pvalue -r $refGen -p $pop -t "Acne" -k "HI" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25v2.csv" -c $pvalue -r $refGen -p $pop -t "Acne" -k "HI" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25v2.csv" -c $pvalue -r $refGen -p $pop -t "Acne" -k "HI" -s "2"

    # TODO test 26 (test 23 without internet)

    # test 27 (-t, -i)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test27.csv" -c $pvalue -r $refGen -p $pop -t "Alzheimer's disease" -i "GCST000010"

    # test 28 (-t x2, -i x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test28.csv" -c $pvalue -r $refGen -p $pop -t "alzheimer's disease" -t "acne" -i "GCST000010" -i "GCST000001"

    # test 29 (-t, -i, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -i "GCST000001" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29v2.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -i "GCST000001" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29v2.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -i "GCST000001" -s "2"

    # TODO test 30 (test 27 without internet)

    # test 31 (-k, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test31.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian"

    # test 32 (-k x2, -e x2)0
    ./runPrsCLI.sh -f $i -o "$outputFolder/test32.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -t "Alzheimer's disease" -i "East asian" -i "european"

    # test 33 (-k, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33v2.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33v2.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian" -s "2"

    # TODO test 34 (test 31 without internet)

    # test 35 (-k, -i)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test35.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001"

    # test 36 (-k x2, -i x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test36.csv" -c $pvalue -r $refGen -p $pop -k "HI" -k "LC" -i "GCST000001" -i "GCST000010"

    # test 37 (-k, -i, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -s "2"

    # TODO test 38 (test 35 without internet)

    # test 39 (-k, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test39.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "African"

    # test 40 (-k x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test40.csv" -c $pvalue -r $refGen -p $pop -k "HI" -k "LC" -e "African" -e "East Asian"

    # test 41 (-k, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "South Asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "South Asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "South Asian" -s "2"

    # TODO test 42 (test 39 without internet)

    # test 43 (-i, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test43.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "East Asian"

    # test 44 (-i x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test44.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -i "GCST000010" -e "east asian" -e "european"

    # test 45 (-i, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "South Asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45v2.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "South Asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45v2.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "South Asian" -s "2"

    # TODO test 46 (test 43 without internet)

    # test 47 (-t, -k, -i)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test47.csv" -c $pvalue -r $refGen -p $pop -t "insomnia" -k "O" -i "GCST000001"

    # test 48 (-t x2, -k x2, -i x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test48.csv" -c $pvalue -r $refGen -p $pop -t "acne" -t "insomnia" -k "HI" -k "LC" -i "GCST000001" -e "GCST000010"

    # test 49 (-t, -k, -i, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test49.csv" -c $pvalue -r $refGen -p $pop -t "insomnia" -k "HI" -i "GCST000001" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test49v2.csv" -c $pvalue -r $refGen -p $pop -t "insomnia" -k "HI" -i "GCST000001" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test49v2.csv" -c $pvalue -r $refGen -p $pop -t "insomnia" -k "HI" -i "GCST000001" -s "2"

    # TODO test 50 (test 47 without internet)

    # test 51 (-t, -k, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test51.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -k "O" -e "European"

    # test 52 (-t x2, -k x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test52.csv" -c $pvalue -r $refGen -p $pop -t "acne" -t "insomnia" -k "LC" -k "HI" -e "east asian" -e "south asian"

    # test 57 (-t, -k, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test53.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "LC" -e "European" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test53v2.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "LC" -e "European" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test53v2.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "LC" -e "European" -s "2"

    # TODO test 54 (test 51 without internet)

    # test 55 (-t, -i, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test55.csv" -c $pvalue -r $refGen -p $pop -t "acne" -i "GCST000001" -e "south asian"

    # test 56 (-t x2, -i x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test56.csv" -c $pvalue -r $refGen -p $pop -t "acne" -t "insomnia" -i "GCST000001" -i "GCST000010" -e "south asian" -e "east asian"

    # test 57 (-t, -i, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test57.csv" -c $pvalue -r $refGen -p $pop -t "acne" -i "GCST000001" -e "European" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test57v2.csv" -c $pvalue -r $refGen -p $pop -t "acne" -i "GCST000001" -e "European" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test57v2.csv" -c $pvalue -r $refGen -p $pop -t "HI" -i "GCST000001" -e "European" -s "2"

    # TODO test 58 (test 55 without internet)

    # test 59 (-k, -i, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test59.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -e "european"

    # test 60 (-k x2, -i x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test60.csv" -c $pvalue -r $refGen -p $pop -k "HI" -k "LC" -i "GCST000001" -i "GCST000010" -e "south asian" -e "east asian"

    # test 61 (-k, -i, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test61.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -e "South Asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test61v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -e "South Asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test61v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -e "South Asian" -s "2"

    # TODO test 62 (test 59 without internet)

    # test 63 (-t, -k, -i, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test63.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "HI" -i "GCST000010" -e "east asian"

    # test 64 (-t x2, -k x2, -i x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test64.csv" -c $pvalue -r $refGen -p $pop -t "acne" -t "alzheimer's disease" -k "HI" -k "LC" -i "GCST000001" -i "GCST000010" -e "European" -e "east asian"

    # test 65 (-t, -k, -i, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test65.csv" -c $pvalue -r $refGen -p $pop -t "Small Artery Occlusion" -k "HI" -i "GCST000001" -e "South asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test65v2.csv" -c $pvalue -r $refGen -p $pop -t "Small Artery Occlusion" -k "HI" -i "GCST000001" -e "South asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test65v2.csv" -c $pvalue -r $refGen -p $pop -t "Small Artery Occlusion" -k "HI" -i "GCST000001" -e "South asian" -s "2"

    # TODO test 66 (test 63 without internet)

    #####################TESTING BAD PARAMETERS#####################

    # test 67 (bad -t)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test67.csv" -c $pvalue -r $refGen -p $pop -t "pink"
    
    # TODO test 68 (test 67 without internet)

    # test 69 (bad -k)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test69.csv" -c $pvalue -r $refGen -p $pop -k "HE"
    
    # TODO test 70 (test 69 without internet)

    # test 71 (bad -i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test71.csv" -c $pvalue -r $refGen -p $pop -i "GCST"
    
    # TODO test 72 (test 71 without internet)
       
    # test 73 (bad -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test73.csv" -c $pvalue -r $refGen -p $pop -e "Not ethnicity"
    
    # TODO test 74 (test 73 without internet)

    # test 75 (bad -v)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test75.csv" -c $pvalue -r $refGen -p $pop -v "yeet"
    
    # TODO test 76 (test 75 without internet)
    
    # test 77 (bad -g)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test77.csv" -c $pvalue -r $refGen -p $pop -g "he"
    
    # TODO test 78 (test 77 without internet)

    # test 79 (bad -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test79.csv" -c $pvalue -r $refGen -p $pop -s "he"
    
    # TODO test 80 (test 79 without internet)

    # test 81 (bad -t and -k)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test81.csv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW"

    # test 82 (test 81 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test82.csv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test82v2.csv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test82v2.csv" -c $pvalue -r $refGen -p $pop -t "pink" -k "HW" -s "2"
    
    # TODO test 83 (test 81 without internet)

    # test 84 (bad -t and -i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test84.csv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST"

    # test 85 (test 84 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test85.csv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test85v2.csv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test85v2.csv" -c $pvalue -r $refGen -p $pop -t "pink" -i "GCST" -s "2"
    
    # TODO test 86 (test 84 without internet)

    # test 87 (bad -t and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test87.csv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ"

    # test 88 (test 87 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test88.csv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test88v2.csv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test88v2.csv" -c $pvalue -r $refGen -p $pop -t "pink" -e "europ" -s "2"
    
    # TODO test 89 (test 87 without internet)

    # test 90 (bad -k and -i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test90.csv" -c $pvalue -r $refGen -p $pop -k "Hi" -i "GCST"

    # test 91 (test 90 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test91.csv" -c $pvalue -r $refGen -p $pop -k "Ho" -i "gcst" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test91v2.csv" -c $pvalue -r $refGen -p $pop -k "Ho" -i "gcst" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test91v2.csv" -c $pvalue -r $refGen -p $pop -k "Ho" -i "gcst" -s "2"
    
    # TODO test 92 (test 90 without internet)

    # test 93 (bad -k and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test93.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus"

    # test 94 (test 93 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test94.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test94v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test94v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "bogus" -s "2"
    
    # TODO test 95 (test 93 without internet)

    # test 96 (bad -i and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test96.csv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus"

    # test 97 (test 96 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test97.csv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test97v2.csv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test97v2.csv" -c $pvalue -r $refGen -p $pop -i "gcst" -e "bogus" -s "2"
    
    # TODO test 98 (test 96 without internet)

    # test 99 (bad -t, -k, and -i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test99.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst"

    # test 100 (test 99 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test100.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test100v2.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test100v2.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -i "gcst" -s "2"
    
    # TODO test 101 (test 99 without internet)

    # test 102 (bad -t, -k, and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test102.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus"

    # test 103 (test 102 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test103.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test103v2.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test103v2.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -k "HI" -e "bogus" -s "2"
    
    # TODO test 104 (test 102 without internet)

    # test 105 (bad -t, -i, and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test105.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus"

    # test 106 (test 105 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test106.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test106v2.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test106v2.csv" -c $pvalue -r $refGen -p $pop -t "flubber" -i "gcst" -e "bogus" -s "2"

    # TODO test 107 (test 105 without internet)

    # test 108 (bad -k, -i, and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test108.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus"

    # test 109 (test 108 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test109.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test109v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test109v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "2"
    
    # TODO test 110 (test 108 without internet)

    # test 111 (bad -t, -k, -i, and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test111.csv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus"

    # test 112 (test 111 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test112.csv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test112v2.csv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test112v2.csv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "2"
    
    # TODO test 113 (test 111 without internet)

    # test 114 (bad -f)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test114.csv" -c $pvalue -r $refGen -p $pop -f "../savcf"

    # TODO test 115 (test 114 without internet)

    # test 116 (bad -o)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test116.csv" -c $pvalue -r $refGen -p $pop -r "output.hem"

    # TODO test 117 (test 116 without internet)

    # test 118 (bad -r)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test118.csv" -c $pvalue -r $refGen -p $pop -r "hg1997"

    # TODO test 119 (test 118 without internet)

    # test 120 (bad -c)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test120.csv" -c $pvalue -r $refGen -p $pop -c "lala"

    # TODO test 121 (test 120 without internet)

    # test 122 (bad -p)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test122.csv" -c $pvalue -r $refGen -p $pop -p "FIF"

    # TODO test 123 (test 122 without internet)

done

