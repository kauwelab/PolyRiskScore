
inputFilePath="sample.txt"
outputFolder="./outputFiles"
pvalue="0.05"
refGen="hg19"
pop="EUR"

validEthnicities=$(curl -s https://prs.byu.edu/ethnicities)
validTraits=$(curl -s https://prs.byu.edu/get_traits)
validStudyTypes=("HI" "LC" "O")



#TODO should we test multiple populations or refgens?

for i in "../sample.vcf" "../sample.txt"; do

    # test 0 (test the basic required parameters. If this fails, we're in trouble!)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test0.csv" -c $pvalue -r $refGen -p $pop

    # test 1 (-t -k -i -e -v -g -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1a.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "HI" -i "GCST007234" -e "european" -v 'true' -g "f" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1b.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "HI" -i "GCST007234" -e "european" -v 'true' -g "Male" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test1b.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "HI" -i "GCST007234" -e "european" -v 'true' -g "Male" -s "2"

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
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21.csv" -c $pvalue -r $refGen -p $pop -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test21v2.csv" -c $pvalue -r $refGen -p $pop -s "2"

    # TODO test 22 (test 21 without internet)

    # test 23 (-t, -k)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test23.csv" -c $pvalue -r $refGen -p $pop -t "Insomnia" -k "LC"

    # test 24 (-t x2, -k x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test24.csv" -c $pvalue -r $refGen -p $pop -t "Insomnia" - t "acne" -k "HI" -k "O"

    # test 25 (-t, -k, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25.csv" -c $pvalue -r $refGen -p $pop -t "Acne" -k "HI" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25.csv" -c $pvalue -r $refGen -p $pop -t "Acne" -k "HI" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test25v2.csv" -c $pvalue -r $refGen -p $pop -t "Acne" -k "HI" -s "2"

    # TODO test 26 (test 23 without internet)

    # test 27 (-t, -i)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test27.csv" -c $pvalue -r $refGen -p $pop -t "Alzheimer's disease" -i "GCST000010"

    # test 28 (-t x2, -i x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test28.csv" -c $pvalue -r $refGen -p $pop -t "alzheimer's disease" -t "acne" -i "GCST000010" -i "GCST000001"

    # test 29 (-t, -i, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -i "GCST000001" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -i "GCST000001" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test29v2.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -i "GCST000001" -s "2"

    # TODO test 30 (test 27 without internet)

    # test 31 (-k, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test31.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian"

    # test 32 (-k x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test32.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -t "Alzheimer's disease" -i "East asian" -i "european"

    # test 33 (-k, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test33v2.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -e "East Asian" -s "2"

    # TODO test 34 (test 31 without internet)

    # test 35 (-k, -i)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test35.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001"

    # test 36 (-k x2, -i x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test36.csv" -c $pvalue -r $refGen -p $pop -k "HI" -k "LC" -i "GCST000001" -i "GCST000010"

    # test 37 (-k, -i, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test37v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "GCST000001" -s "2"

    # TODO test 38 (test 35 without internet)

    # test 39 (-k, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test39.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "African"

    # test 40 (-k x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test40.csv" -c $pvalue -r $refGen -p $pop -k "HI" -k "LC" -e "African" -e "East Asian"

    # test 41 (-k, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "South Asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "South Asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test41v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -e "South Asian" -s "2"

    # TODO test 42 (test 39 without internet)

    # test 43 (-i, -e)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test43.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "East Asian"

    # test 44 (-i x2, -e x2)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test44.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -i "GCST000010" -e "east asian" -e "european"

    # test 45 (-i, -e, -s)
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "South Asian" -s "2"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "South Asian" -s "1"
    ./runPrsCLI.sh -f $i -o "$outputFolder/test45v2.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -e "South Asian" -s "2"

    # TODO test 46 (test 43 without internet)


    # test 108 (bad -k, -i, and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test108.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus"

    # test 109 (test 108 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test109.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test109.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "1"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test109v2.csv" -c $pvalue -r $refGen -p $pop -k "HI" -i "gcst" -e "bogus" -s "2"
    
    # TODO test 110 (test 108 without internet)

    # test 111 (bad -t, -k, -i, and -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test111.csv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus"

    # test 112 (test 111 with -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test112.csv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "2"
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test112.csv" -c $pvalue -r $refGen -p $pop -t "yeet" -k "HI" -i "gcst" -e "bogus" -s "1"
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

