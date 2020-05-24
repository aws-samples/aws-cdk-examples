/**
 * Empty the dist folder.
 */

const fs = require('fs-extra');

fs.emptyDirSync('web/dist');
fs.emptyDirSync('build');