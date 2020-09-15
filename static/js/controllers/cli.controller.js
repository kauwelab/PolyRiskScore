const path = require("path")
const lineReader = require('line-reader')

exports.version = async (req,res) => {
    version = "1.0.0"
    version = await lineReader.eachLine(path.join(__dirname, '../..', 'downloadables/runPrsCLI.sh'), function(line) {
        if (line.match('^version=')) {
            console.log(line)
            version = line.match('([0-9]+.[0-9]+.[0-9]+)')[0]
            res.send(version)
        }
    })
}

exports.download = (req,res) => {
    downloadPath = path.join(__dirname, '../..', 'downloadables')
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
        filename: 'PrskbCLITool.zip'
    });
}