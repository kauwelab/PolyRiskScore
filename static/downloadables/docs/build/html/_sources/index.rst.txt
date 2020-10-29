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

* Searching our database for studies and traits
* Learning about required and optional parameters for performing calculations
* Calculating polygenic risk scores

Quick Start
-----------

To download the PRSKB CLI tool, head over to the `PRSKB website download page <https://prs.byu.edu/cli_download.html>`_ or download the files directly from `GitHub <https://github.com/louisadayton/PolyRiskScore>`_.

Given the required parameters, the tool will calculate risk scores for each individual sample for each study in our database (this needs to be worded better). 

Required Parameters Example
^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.05 -r hg19 -p EUR 


Features
========

The CLI polygenic risk score calculator can be run directly from the command-line or through the CLI's interactive menu. The menu includes the options to search our database and to learn more about the parameters involved in risk score calculations. 
To access the menu, run the script without parameters. You will be given the option to see the usage statement or start the interactive menu. 

(Insert picture here)

Search the Database
----------------------

Through the interactive menu, users can search our database for traits or studies. This can be helpful when filtering studies to run the calculator on. 

After selecting the menu option to search for studies or traits, you will be prompted to specify if you are searching for studies or traits. You can then enter the search term you wish to use. 

(insert picture here)

When the search is complete, the results will be outputted to the console, and you will be returned to the menu. 

Learn about Parameters 
----------------------

The menu also has an option for learning about the parameters involved in filtering studies and calculating scores. 

(insert picture of params menu?)

Required Parameters
^^^^^^^^^^^^^^^^^^^

File Path (-f)
""""""""""""""
The path to the input file. Either a vcf or a txt with lines formatted as rsID:allele1,allele2

.. code-block:: bash

   -f path/to/file/samples.vcf

Output File (-o)
""""""""""""""""
The path to output file. Can be either a csv or a json. (TODO somewhere we need to add the option for either full or condesnded output)

.. code-block:: bash

   -o path/to/file/output.csv

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

Optional Parameters
^^^^^^^^^^^^^^^^^^^

When specifying more than one, add the identifying flag in front of every _____ specified.

Traits (-t)
"""""""""""
Specific traits to run the calculator on. 

.. code-block:: bash

   -t "alzheimer's disease" -t acne

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

Step Number (-s)
""""""""""""""""
Breaks running the calculator into steps. Make sure when you are running the CLI in steps that the only parameter that changes between the two steps is the step parameter. NOTE: you may only specify this once

Step 1 deals with downloading data from the server for use in calculations. This step requires internet access.

Step 2 deals with the actual calculation of polygenic risk scores. This step does not require internet access but does need to have access to the files that were downloaded in step 1. 

.. code-block:: bash

   -s 1


Calculate Scores
----------------

Polygenic risk scores can be calculated directly through the command-line or through the interactive menu. Using just the required parameters, the CLI will calculate risk scores for all studies in our database for each individual in the input file. Additional parameters will filter studies to be included in the calculation. 


Examples
========

Run the calculator on all studies in our database:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.0005 -r hg19 -p SAS 

Run the calculator on all studies about the trait 'acne':

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.0005 -r hg19 -p SAS -t acne 

Run the calculator on all high impact studies with samples that are of european descent:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.0005 -r hg19 -p AMR -k HI -e european 

Run the calculator on the study with studyID GCST004410:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.0005 -r hg19 -p EUR -i GCST004410 

Run the calculator on all studies in the database in two steps:

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.0005 -r hg19 -p SAS -s 1 
   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.0005 -r hg19 -p SAS -s 2 


Output Results
==============

There are two choices for the output results - condensed (default) or full. 

Condensed
---------

This version of the output results contains one row for each study with columns for each sample's polygenic risk score. 

Study ID | Citation | Reported Trait | Trait(s) | Sample1 | Sample2 | Sample3 | ect. 

(TODO - add code that you run for the example output file)
(Use the extension to add the output file results)

Full
----

This version of the output results contains one row for each sample/study pair. It also includes columns listing the rsIDs of the snps involved in the risk score calculation. 

Sample | Study ID | Citation | Reported Trait | Traits(s) | Risk Score | Protective Alleles | Risk Alleles | Neutral Alleles

(TODO - add code that you run for the example output file)
(Use the extension to add the output file results)