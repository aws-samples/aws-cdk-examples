/**
 * Empty the dist folder.
 */

const fs = require('fs-extra');

fs.emptyDirSync('dist');
fs.emptyDirSync('build');