/**
 * Copy files to the dist folder after a build.
 */

const fs = require('fs-extra');

fs.ensureDirSync('dist');
fs.ensureDirSync('dist/web');
fs.ensureDirSync('dist/web/img');
fs.ensureDirSync('dist/lambda');
fs.ensureDirSync('dist/lambda/node_modules');

fs.copySync('web/img', 'dist/web/img');

fs.copySync('web/index.html', 'dist/web/index.html');
fs.copySync('web/index.css', 'dist/web/index.css');
fs.copySync('web/config.js', 'dist/web/config.js');

fs.copySync('functions', 'dist/lambda');
