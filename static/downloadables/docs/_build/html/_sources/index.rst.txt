.. PRSKB CLI documentation master file, created by
   sphinx-quickstart on Fri Oct 23 23:04:05 2020.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome to PRSKB's CLI documentation!
=====================================

.. toctree::
   :maxdepth: 2
   :caption: Contents:

The PRSKB's CLI tool is an extension of the PRSKB web application. It is designed to give more flexability and capability in calculating polygenic risk scores for large datasets. Features include:

* Searching the database for studies and traits
* Printing out available ethnicities to filter by
* Learning about required and optional parameters for performing calculations
* Calculating polygenic risk scores

Quick Start
-----------

To download the PRSKB CLI tool, head over to the `PRSKB website download page <https://prs.byu.edu/cli_download.html>`_ or download the whole repository directly from `GitHub <https://github.com/kauwelab/PolyRiskScore>`_.

Given the required parameters, the tool will calculate risk scores for each individual sample for each study and trait combination in the database. 

*NOTE: You MUST have bash and jq for bash, and python3 and the PyVCF, filelock, and requests Python modules installed.*

Required Parameters Example
^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.05 -r hg19 -p EUR


Features
========

The CLI polygenic risk score calculator can be run directly from the command-line or through the CLI's interactive menu. The menu includes the options to search the database and to learn more about the parameters involved in risk score calculations. 
To access the menu, run the script without parameters. You will be given the option to see the usage statement or start the interactive menu. 

.. image:: ../../images/RunCLIwithoutParams.png
  :alt: CLI tool run without parameters

.. image:: ../../images/RunMenu.png
  :alt: CLI menu screen shot

Search the Database
----------------------

Through the interactive menu, users can search the database for traits or studies. This can be helpful when filtering studies to run the calculator on. 

After selecting the menu option to search for studies or traits, you will be prompted to specify if you are searching for studies or traits. You can then enter the search term you wish to use. 

.. image:: ../../images/SearchTraits.png
  :alt: Screenshot example for searching traits about teeth

When the search is complete, the results will be printed to the console, and you will be returned to the menu. 

Display Ethnicities
--------------------

The menu has an option for displaying the available ethnicities to filter studies by.

.. image:: ../../images/displayEthnicities.png
  :alt: Screenshot showing displayed ethnicities

Learn about Parameters 
----------------------

The menu also has an option for learning about the parameters involved in filtering studies and calculating scores. 

.. image:: ../../images/LearnAboutParams.png
  :alt: Screen shot of Parameters menu

Required Parameters
^^^^^^^^^^^^^^^^^^^

File Path (-f)
""""""""""""""
The path to the input file. Either a vcf or a txt with lines formatted as rsID:allele1,allele2

.. code-block:: bash

   -f path/to/file/samples.vcf

Output File (-o)
""""""""""""""""
The path to output file. Can be either a tsv or a json. 

.. code-block:: bash

   -o path/to/file/output.tsv

P-value Cutoff (-c)
"""""""""""""""""""
Creates a threshold for included snps.

.. code-block:: bash

   -c 0.0005

Reference Genome (-r)
"""""""""""""""""""""
The reference genome of samples in the input file. Available reference genomes: hg17, hg18, hg19, or hg38

.. code-block:: bash

   -r hg19

Super Population (-p)
"""""""""""""""""""""
The super population of samples in the input file. These are the five super populations from the 1000 genomes project

* AFR - African
* AMR - American
* EAS - East Asian
* EUR - European
* SAS - South Asian

.. code-block:: bash

   -p EUR

Optional Filtering Parameters
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To run the PRSKB CLI calculator on a more specific set of studies, optional filtering parameters can be added. When specifying more than one, add the identifying flag in front of every filter specified. 

Traits (-t)
"""""""""""
Specific traits to run the calculator on. 

.. code-block:: bash

   -t "Alzheimer's Disease" -t acne

Study Types (-k)
""""""""""""""""
Specifies what kinds of studies to run analyses on. 

* HI (high impact) - studies that have the highest altmetric score within their trait group
* LC (largest cohort) - studies that have the largest sample size (initial and replication combined)
* O (other) - all other studies that do not fall in the first two categories

.. code-block:: bash

   -k HI -k LC

Study IDs (-i)
""""""""""""""
Specifies the studyID(s) of studies to run the calculator on.

.. code-block:: bash

   -i GCST004410

Ethnicity (-e)
""""""""""""""
Filters studies by the ethnicity of their sample population.

.. code-block:: bash

   -e European -e "East Asian"

Additonal Optional Parameters
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

These additional parameters manage calculation details and may only be specified once per calculation.

Verbose (-v)
"""""""""""""
Creates a more detailed TSV result file. 
The verbose output file will include the following for each corresponding sample, study, and trait combination: 

* reported trait
* trait
* polygenic risk score
* protective variants
* risk variants
* variants that are present but do not include the risk allele
* variants that are in high linkage disequilibrium whose odds ratios are not included in the calculations

If the output file is in TSV format and this parameter is not included, the default TSV result
file will include the study ID and the corresponding polygenic risk scores for each sample.
If the output file is in JSON format, the results will, by default, be in verbose format.

*NOTE: There is no condensed version of JSON output.*

.. code-block:: bash

   -v

Default Sex (-g)
""""""""""""""""
Though a rare occurence, some studies have duplicates of the same snp that differ by which
biological sex the p-value is associated with. You can indicate which sex you would like snps
to select when both options (M/F) are present. The system default is Female.

.. code-block:: bash

   -g f

Step Number (-s)
""""""""""""""""
Breaks running the calculator into steps. Make sure when you are running the CLI in steps that the only parameter that changes between the two steps is the step parameter.

Step 1 deals with downloading data from the server for use in calculations. This step requires internet access.

Step 2 deals with the actual calculation of polygenic risk scores. This step does not require internet access but does need to have access to the files that were downloaded in step 1. 

.. code-block:: bash

   -s 1

Number Of Processes (-n)
""""""""""""""""""""""""

This parameter determines the number of subprocesses used by the Python multiprocessing module during the calculations. If no value is given by the user, all available cores will be utilized.

.. code-block:: bash

   -n 4


Calculate Scores
----------------

Polygenic risk scores can be calculated directly through the command-line or through the interactive menu. Using just the required parameters, the CLI will calculate risk scores for all studies in the database for each individual in the input file. Additional parameters will filter studies to be included in the calculation. 


Examples
========

Run the calculator on all studies in the database:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS 

Run the calculator on all studies about the trait 'acne':

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS -t acne 

Run the calculator on all high impact studies with samples that are of European descent:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p AMR -k HI -e european 

Run the calculator on the study with study ID GCST004410:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p EUR -i GCST004410 

Run the calculator on all studies in the database in two steps:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS -s 1 
   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS -s 2 

Run the calculator on all studies about the trait 'acne', filtering studies from the allAssociations_hg19_f.txt working file:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS
   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS -t acne -s 2 

More examples can be found in the CLI download README.md

Output Results
==============

There are two choices for the tsv output results - condensed (default) or full. 

Condensed
---------

This version of the output results contains one row for each study with columns for each sample's polygenic risk score. 

Study ID | Citation | Reported Trait | Trait(s) | Sample1 | Sample2 | Sample3 | ect. 

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS

Full
----

This version of the output results contains one row for each sample/study pair. It also includes columns listing the rsIDs of the snps involved in the risk score calculation. 

Sample | Study ID | Citation | Reported Trait | Traits(s) | Risk Score | Protective Variants | Risk Variants | Variants Without Risk Allele | Variants in High LD

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS -v
