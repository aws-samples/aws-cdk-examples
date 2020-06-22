/**
 * Copy files to the dist folder after a build.
 */

import * as fs from 'fs-extra';

fs.ensureDirSync('dist');
fs.ensureDirSync('dist/web');
fs.ensureDirSync('dist/web/img');
fs.ensureDirSync('dist/lambda');
fs.ensureDirSync('dist/lambda/node_modules');
fs.ensureDirSync('lambda/node_modules');

fs.emptyDirSync('dist');

fs.copySync('web/img', 'dist/web/img');

fs.copySync('web/index.html', 'dist/web/index.html');
fs.copySync('web/index.css', 'dist/web/index.css');
fs.copySync('build/web/bundle.js', 'dist/web/bundle.js');

fs.copySync('build/lambda', 'dist/lambda');
fs.copySync('lambda/node_modules', 'dist/lambda/node_modules');
