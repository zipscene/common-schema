var esTranspiler = require('broccoli-babel-transpiler');
var pickFiles = require('broccoli-static-compiler');
var WrapFiles = require('broccoli-wrap');
var mergeTrees = require('broccoli-merge-trees');
var Promise = require('es6-promise').Promise;
var fs = require('fs');

// Returns a broc tree corresponding to the original source files
function getSourceTrees() {
	var pathsToSearch = [ 'lib', 'src', 'test', 'bin' ];

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
		},
		cleanup: function() {
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
	return new WrapFiles(tree, {
		wrapper: [ sourceMapString, '' ],
		extensions: [ 'js' ]
	});
}

function addBinShebang(tree) {
	var shebangTree = new WrapFiles(tree, {
		wrapper: [ '#!/usr/bin/env node\n', '' ],
		extension: [ 'js' ]
	});
	shebangTree.processString = function(string, relativePath) {
		// Ensure this file is in the bin folder
		if (/^bin\//.test(relativePath)) {
			// This is in the bin folder, run the wrapper
			return WrapFiles.prototype.processString.call(this, string, relativePath);
		} else {
			return string;
		}
	};
	return shebangTree;
}


var source = getSourceTrees();
var sourceMapSupportTree = addSourceMapSupport(source);
var transpiledTree = esTranspiler(sourceMapSupportTree);
var shebangedTree = addBinShebang(transpiledTree);

module.exports = shebangedTree;
