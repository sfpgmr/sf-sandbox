// rollup.config.js

import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default 
{
      input: './current/src/js/main.js',
      plugins: [
        nodeResolve({ jsnext: true }),
        commonjs()
      ],
      external:[
        'sharp','electron','events'
      ],
      output: {
        file: './current/build/main.js',
        format: 'iife',
        sourcemap: true
      }
  
};
