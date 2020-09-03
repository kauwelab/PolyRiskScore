const path = require("path")

exports.version = (req,res) => {
    // todo access the file to give the version
    res.send("1.0.1")
}

exports.download = (req,res) => {
    downloadPath = path.join(__dirname, '../..', 'downloadables')
    console.log(downloadPath)
    res.zip({
        files: [{
            path: path.join(downloadPath, '/run_prs_grep.py'),
            name: '/run_prs_grep.py'
        }, {
            path: path.join(downloadPath, '/vcf_parser_grep.py'),
            name: '/vcf_parser_grep.py'
        }, {
            path: path.join(downloadPath, '/runPrsCLI.sh'),
            name: '/runPrsCLI.sh'
        }],
        filename: 'test.zip'
    })
}