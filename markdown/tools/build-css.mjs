import path from 'path';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import atImport from 'postcss-import';
import mixin from 'postcss-mixins';
import nested from 'postcss-nested';
import simpleVars from 'postcss-simple-vars';
import apply from 'postcss-apply';
import postcssPresetEnv from 'postcss-preset-env';
import cssVariables from 'postcss-css-variables';
import perfectionist from 'perfectionist';
import cssnano from 'cssnano';
//import precss  from 'precss';
import fs from 'fs-extra';

process.chdir(path.resolve(path.dirname(new URL(import.meta.url).pathname),'../'));

async function buildcss(){
  const src = process.argv[2];
  const dest = process.argv[3];
  console.info(`${src} ==> ${dest}`);
  const css = await fs.readFile(src,'utf8');

  
  const processedCss = await
  postcss([
    autoprefixer,atImport,mixin,nested,cssVariables,simpleVars,apply,postcssPresetEnv({stage:0, preserve: false}),perfectionist,cssnano
  ]).process(css,{
    from:src,to:dest
  });
  // await postcss([
  //   atImport(),autoprefixer(),mixin(),nested(),simpleVars(),apply(),postcssPresetEnv()
  // ]).process(css,{
  //   from:src,to:dest2
  // });
  //for(const i in processedCss){
  //  console.log(processedCss.messages);
  //}
  await fs.writeFile(dest,processedCss.css,'utf8');
  //await fs.writeFile(dest2,processedCss.css,'utf8');
}

try {
  buildcss();
} catch (e) {
  console.error(e.stack);
  process.abort();
}
