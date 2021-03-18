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
            path: path.join(downloadPath, '/parse_associations.py'),
            name: '/parse_associations.py'
        }, {
            path: path.join(downloadPath, '/grep_file.py'),
            name: '/grep_file.py'
        }, {
            path: path.join(downloadPath, '/connect_to_server.py'),
            name: '/connect_to_server.py'
        }, {
            path: path.join(downloadPath, '/calculate_score.py'),
            name: '/calculate_score.py'
        }, {
            path: path.join(downloadPath, '/write_to_file.py'),
            name: '/write_to_file.py'
        }, {
            path: path.join(downloadPath, '/runPrsCLI.sh'),
            name: '/runPrsCLI.sh'
        }, {
            path: path.join(downloadPath, '/README.md'),
            name: '/README.md'
        }],
        filename: 'PrskbCLITool.zip'
    });
}
