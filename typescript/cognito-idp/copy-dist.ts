/**
 * Copy files to the dist folder after a build.
 */

const fs = require('fs-extra');

fs.ensureDirSync("web/dist");

fs.copySync("web/index.html", "web/dist/index.html");
fs.copySync("web/index.css", "web/dist/index.css");
