// rollup.config.js

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import svelte from 'rollup-plugin-svelte';
import postcss from 'rollup-plugin-postcss';
import preprocess from 'svelte-preprocess';

export default [
{
      input: './current/src/js/index.js',
      plugins: [
        nodeResolve({ jsnext: true }),
        commonjs()
      ],
      external:[
        'sharp','electron','events'
      ],
      output: {
        file: './current/build/index.js',
        format: 'iife'
      }
  
},
{
  input: './current/src/js/similar-list-main.js',
  plugins: [
    svelte({
      compilerOptions : {
        generate:'dom'
      },
      preprocess: preprocess()
    }),
    nodeResolve({ browser:true,dedupe: ['svelte'] }),
    commonjs(),
    postcss()
  ],
  external:[
    'sharp','electron','events'
  ],
  output: {
    file: './current/build/similar-list.js',
    format: 'iife',
    name: 'app'
  }
}
];
