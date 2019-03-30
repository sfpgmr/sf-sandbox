// rollup.config.js

import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/js/electron/main.js',
  output: {
    file: 'dist/electron/main.js',
    format: 'cjs'
  },
  plugins: [
    nodeResolve({ jsnext: true }),
    commonjs()
  ],
  external:[
    'sharp','electron','events','tween',
  ]  
};
