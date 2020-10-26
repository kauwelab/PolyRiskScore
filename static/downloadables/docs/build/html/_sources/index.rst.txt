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

Given the required params, the tool will calculate risk scores for each individual sample for each study in our database (this needs to be worded better). 

Example
^^^^^^^

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.csv -c 0.05 -r hg19 -p EUR

TODO: write about the download and running the calculator straight from the command line


Features
========

The CLI polygenic risk score calculator can be run directly from the command-line or through the CLI's interactive menu. The menu includes the options to search our database and to learn more about the parameters involved in risk score calculations. To access the menu, run the script without parameters. 

Search the Database
----------------------

Through the interactive menu, users can search our database for traits or studies. This can be helpful when filtering studies to run the calculator on. 

Learn about Parameters 
----------------------

The menu also has an option for learning about the parameters involved in filtering studies and calculating scores. 

Parameters
^^^^^^^^^^

Required:

* -f path to input file
* -o path to output file 
* -c pvalue cutoff
* -r reference genome of samples
* -p super population (1000 genomes) of samples

Optional:

* -t traits (for filtering)
* -k studyType (for filtering)
* -i studyIDs (choose specific studies)
* -e ethnicity (for filtering)
* -s step number


Calculate Scores
----------------

Polygenic risk scores can be calculated directly through the command-line or through the interactive menu. Using just the required parameters, the CLI will calculate risk scores for all studies in our database for each individual in the input file. Additional parameters will filter studies to be included in the calculation. 

Output Results
==============

There are two choices for the output results - condensed (default) or full. 

Condensed
---------

This version of the output results contains one row for each study with columns for each sample's polygenic risk score. 

Study ID | Citation | Reported Trait | Trait(s) | Sample1 | Sample2 | Sample3 | ect. 


Full
----

This version of the output results contains one row for each sample/study pair. It also includes columns listing the rsIDs of the snps involved in the risk score calculation. 

Sample | Study ID | Citation | Reported Trait | Traits(s) | Risk Score | Protective Alleles | Risk Alleles | Neutral Alleles