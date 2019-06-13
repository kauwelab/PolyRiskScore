<p align="center">
  <a href="http://bionode.io">
    <img height="200" width="200" title="bionode" alt="bionode logo" src="https://rawgithub.com/bionode/bionode/master/docs/bionode-logo.min.svg"/>
  </a>
  <br/>
  <a href="http://bionode.io/">bionode.io</a>
</p>


# bionode-vcf

> a vcf parser in javascript

[![npm](https://img.shields.io/npm/v/bionode-vcf.svg?style=flat-square)](http://npmjs.org/package/bionode-vcf)
[![Travis](https://img.shields.io/travis/bionode/bionode-vcf.svg?style=flat-square)](https://travis-ci.org/bionode/bionode-vcf)
[![Coveralls](https://img.shields.io/coveralls/bionode/bionode-vcf.svg?style=flat-square)](http://coveralls.io/r/bionode/bionode-vcf)
[![Dependencies](http://img.shields.io/david/bionode/bionode-vcf.svg?style=flat-square)](http://david-dm.org/bionode/bionode-vcf)
[![npm](https://img.shields.io/npm/dt/bionode-vcf.svg?style=flat-square)](https://www.npmjs.com/package/bionode-vcf)
[![Gitter](https://img.shields.io/gitter/room/nwjs/nw.js.svg?style=flat-square)](https://gitter.im/bionode/bionode)


## Install

You need to install the latest Node.JS first, please check [nodejs.org](http://nodejs.org) or do the following:

```bash
# Ubuntu
sudo apt-get install npm
# Mac
brew install node
# Both
npm install -g n
n stable
```

To use `bionode-vcf` as a command line tool, you can install it globally with `-g`.

```bash
npm install bionode-vcf -g
```

Or, if you want to use it as a JavaScript library, you need to install it in your local project folder inside the `node_modules` directory by doing the same command **without** `-g`.

```bash
npm i bionode-vcf # 'i' can be used as shortcut to 'install'
```


### Usage

#### vcf.read
- `vcf.read` takes params: `path`
- The supported filetypes are `vcf`, `zip` and `gz`.

```javascript
var vcf = require('bionode-vcf');
vcf.read("/path/sample.vcf");
vcf.on('data', function(feature){
    console.log(feature);
})

vcf.on('end', function(){
    console.log('end of file')
})

vcf.on('error', function(err){
    console.error('it\'s not a vcf', err)
})

```

#### vcf.readStream
- `vcf.readStream` takes params: `stream` and `extension`
- The supported extension are `vcf`, `zip` and `gz`.

```javascript
var vcf = require('bionode-vcf');
var fileStream = s3.getObject({
    Bucket: [BUCKETNAME],
    Key: [FILENAME]
}).createReadStream();  // or stream data from any other source

vcf.read(filestream, 'zip'); // default value is `vcf`
vcf.on('data', function(feature){
    console.log(feature);
})

vcf.on('end', function(){
    console.log('end of file')
})

vcf.on('error', function(err){
    console.error('it\'s not a vcf', err)
})

```

## Documentation

VCF format specifications and more information about the fileds can be found at
[1000 genomes webpage](http://www.1000genomes.org/wiki/analysis/variant%20call%20format/vcf-variant-call-format-version-41) and
[samtools github page](https://github.com/samtools/hts-specs)


## Contributing

We welcome all kinds of contributions at all levels of experience, please read the [CONTRIBUTING.md](CONTRIBUTING.md) to get started!
