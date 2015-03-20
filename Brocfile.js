var esTranspiler = require('broccoli-babel-transpiler');
var pickFiles = require('broccoli-static-compiler');
var wrapFiles = require('broccoli-wrap');
var mergeTrees = require('broccoli-merge-trees');
var Promise = require('es6-promise').Promise;
var fs = require('fs');

var babelrc;
if(fs.existsSync('./.babelrc')) {
	try {
		babelrc = JSON.parse(fs.readFileSync('./.babelrc', {encoding: 'utf8'}));
	} catch (ex) {
		console.log(ex);
	}
}

// Returns a broc tree corresponding to the original source files
function getSourceTrees() {
	var pathsToSearch = [ 'lib', 'src', 'test' ];

	return {
		read: function(readTree) {
			var promises = pathsToSearch.map(function(path) {
				return new Promise(function(resolve) {
					fs.exists(path, function(exists) {
						if(exists) {
							resolve(path);
						} else {
							resolve();
						}
					});
				});
			});
			return Promise.all(promises).then(function(paths) {
				paths = paths.filter(function(path) { return !!path; });
				if (paths.length === 0) {
					throw new Error('No source paths found');
				}
				console.log('Found source paths: ' + paths.join(', '));
				var pathTrees = paths.map(function(path) {
					return pickFiles(path, {
						srcDir: '.',
						destDir: path
					});
				});
				return readTree(mergeTrees(pathTrees));
			});
		}
	};
}

function addSourceMapSupport(tree) {
	// Adds an optional dependency to install source tree stack trace support
	// if the relevant package ("source-map-support") is installed.
	// The string in require() is split up to prevent browserify from
	// catching and including it.
	// It's important that this is all on one line because it's prepended to the
	// source before being transpiled, and would mess up line numbers otherwise.
	var sourceMapString = '' +
		'!(function() {try{' +
		'require("s"+"ource-map-support").install();' +
		'}catch(e){}})();';
	return wrapFiles(tree, {
		wrapper: [ sourceMapString, '' ],
		extensions: [ 'js' ]
	});
}


var source = getSourceTrees();
var sourceMapSupportTree = addSourceMapSupport(source);
var transpiledTree = esTranspiler(sourceMapSupportTree, babelrc || {});

module.exports = transpiledTree;
