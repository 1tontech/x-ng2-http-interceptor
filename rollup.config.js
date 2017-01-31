export default {
  entry: 'dist/index.js',
  dest: 'dist/bundles/x-ng2-http-interceptor.umd.js',
  sourceMap: false,
  format: 'umd',
  moduleName: 'ng.x-ng2-http-interceptor',
  globals: {
    '@angular/core': 'ng.core',
    '@angular/http': 'ng.http',
    'rxjs/Observable': 'Rx'
  }
}
