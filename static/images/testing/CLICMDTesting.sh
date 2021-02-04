
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
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test1.csv" -c $pvalue -r $refGen -p $pop -t "acne" -k "HI" -i "GCST007234" -e "european" -v -g "Male" -s

    # TODO test 2 (do test 1 but without internet)

    # test 3 (-t)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test3.csv" -c $pvalue -r $refGen -p $pop -t "Autosomal Dominant Compelling Helio-Ophthalmic Outburst Syndrome"

    # test 4 (2 traits using -t0
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test4.csv" -c $pvalue -r $refGen -p $pop -t "Yu-Zhi Constitution Type" -t "Ischemic Cardiomyopathy"

    # TODO test 5 (do test 3, but without internet)

    # test 6 (-k)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test6.csv" -c $pvalue -r $refGen -p $pop -k "LC"

    # test 7 (2 study types using -k)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test7.csv" -c $pvalue -r $refGen -p $pop -k "LC" -k "HI"

    # TODO test 8 (do test 6, but without internet)

    # test 9 (-i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test9.csv" -c $pvalue -r $refGen -p $pop -i "GCST003378"

    # test 10 (2 study IDs using -i)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test9.csv" -c $pvalue -r $refGen -p $pop -i "GCST007897" -i "GCST90000255"

    # TODO test 11 (do test 9, but without internet)

    # test 12 (-e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test12.csv" -c $pvalue -r $refGen -p $pop -e "Sub-Saharan African"

    # test 13 (2 ethnicities using -e)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test13.csv" -c $pvalue -r $refGen -p $pop -e "Unspecified" -e "Other"

    # TODO test 14 (do test 11, but without internet)

    # test 15 (-v)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test15.csv" -c $pvalue -r $refGen -p $pop -v "true"

    # TODO test 16 (do test 15, but without internet)

    # test 17 (-g)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test17.csv" -c $pvalue -r $refGen -p $pop -g "Male"

    # TODO test 18 (do test 17, but without internet)

    # test 19 (-s)
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test19.csv" -c $pvalue -r $refGen -p $pop -s "1"
    # test 19.5
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test19.5.csv" -c $pvalue -r $refGen -p $pop -s "2"

    # TODO test 20 (do test 19, but without internet)

    # test 21 
    ./runPrsCLI.sh -f $inputFilePath -o "$outputFolder/test21.csv" -c $pvalue -r $refGen -p $pop -t "Vitiligo" -k "O"
done

