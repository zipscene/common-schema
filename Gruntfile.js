module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		broccoli: {
			dist: {
				dest: 'dist'
			}
		}
	});

	grunt.loadNpmTasks('grunt-broccoli');

	grunt.registerTask('build', [
		'broccoli:dist:build'
	]);

	grunt.registerTask('watch', [
		'broccoli:dist:watch'
	]);

	grunt.registerTask('default', [ 'build' ]);

};

