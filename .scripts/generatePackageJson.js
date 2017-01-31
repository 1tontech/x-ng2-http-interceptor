var fs = require('fs');
var jsonFormat = require('json-format');

var distPackageJsonContentAsStr = fs.readFileSync('package.json');
var distPackageJsonContent = JSON.parse(distPackageJsonContentAsStr);

distPackageJsonContent['main'] = 'bundles/' + distPackageJsonContent.name + '.umd.min.js';
distPackageJsonContent['module'] = 'index.js';
distPackageJsonContent['typings'] = 'index.d.ts';

Object.defineProperty(distPackageJsonContent, 'peerDependencies', Object.getOwnPropertyDescriptor(distPackageJsonContent, 'dependencies'));
delete distPackageJsonContent['dependencies'];
delete distPackageJsonContent['devDependencies'];
delete distPackageJsonContent['scripts'];

fs.writeFileSync('dist/package.json', jsonFormat(distPackageJsonContent, {
  type: 'space',
  size: 2
}));
