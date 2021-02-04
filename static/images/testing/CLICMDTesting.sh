
inputFilePath="sample.txt"
outputFolder="./outputFiles"
pvalue="0.05"
refGen="hg19"
pop="EUR"

#TODO should we test multiple populations or refgens?

for i in "sample.vcf" "sample.txt"; do
    # test 0 (test the basic required parameters. If this fails, we're in trouble!)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test0.csv" -c $pvalue -r $refGen -p $pop

    # test 1 (-t -k -i -e -v -g -s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test1.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "HI" -i "GCST007234" -e "european" -v -g "Male" -s "1"

    # TODO test 2 (do test 1 but without internet)

    # test 3 (-t)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test3.csv" -c $pvalue -r $refGen -p $pop -t "Asthma"

    # test 4 (-t again)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test4.csv" -c $pvalue -r $refGen -p $pop -t "Alzheimer's Disease"

    # test 5 (2 traits using -t)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test5.csv" -c $pvalue -r $refGen -p $pop -t "Asthma" -t "insomnia"

    # TODO test 6 (do test 3, but without internet)

    # test 7 (-k)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test7.csv" -c $pvalue -r $refGen -p $pop -k "LC"

    # test 8 (2 study types using -k)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test8.csv" -c $pvalue -r $refGen -p $pop -k "LC" -k "O"

    # TODO test 9 (do test 7, but without internet)

    # test 10 (-i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test10.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001"

    # test 11 (-i, but the id is not in our database)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test11.csv" -c $pvalue -r $refGen -p $pop -i "GCST000003"

    # test 12 (2 study IDs using -i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test12.csv" -c $pvalue -r $refGen -p $pop -i "GCST000001" -i "GCST000010"

    # TODO test 13 (do test 10, but without internet)

    # test 14 (-e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test14.csv" -c $pvalue -r $refGen -p $pop -e "East Asian"

    # test 15 (2 ethnicities using -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test15.csv" -c $pvalue -r $refGen -p $pop -e "East Asian" -e "european"

    # TODO test 16 (do test 14, but without internet)

    # test 17 (-v)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test17.csv" -c $pvalue -r $refGen -p $pop -v "true"

    # TODO test 18 (do test 17, but without internet)

    # test 19 (-g)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test19.csv" -c $pvalue -r $refGen -p $pop -g "Male"

    # TODO test 20 (do test 19, but without internet)

    # test 21 (-s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test21.csv" -c $pvalue -r $refGen -p $pop -s "1"

    # test 21.5
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test21.5.csv" -c $pvalue -r $refGen -p $pop -s "2"

    # TODO test 22 (do test 21, but without internet)

    # test 23 
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test23.csv" -c $pvalue -r $refGen -p $pop -t "Insomnia" -k "LC"
done

