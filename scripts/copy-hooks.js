const fs = require('fs-extra');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'hooks');
const destDir = path.join(__dirname, '..', 'dist', 'hooks');

fs.ensureDirSync(destDir);
fs.copySync(srcDir, destDir, {
  filter: (src) => {
    if (fs.statSync(src).isDirectory()) return true;
    return path.extname(src) === '.js';
  }
});

console.log('Copied hook files to dist/hooks/');
