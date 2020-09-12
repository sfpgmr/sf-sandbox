import AmpOptimizer from '@ampproject/toolbox-optimizer';
import MarkdownIt from 'markdown-it';
import fs from 'fs-extra';
import ejs from 'ejs';
import buildCss from './build-css.mjs';
import PurgeCSS from 'purgecss';
import sass from 'node-sass';
import util from 'util';
import path from 'path';
import { setFlagsFromString } from 'v8';
import { EEXIST } from 'constants';

const sassp = util.promisify(sass.render.bind(sass));

let debug = true;

if(process.argv[2] == 'release'){
  debug = false;
}

async function buildPage({templatePath,scssPath,outputPath,contentPath}) {
  const template = ejs.compile(await fs.promises.readFile(templatePath,'utf8'),{
    filename  :templatePath
  });
  
  // CSSのビルド
  const resultCss = await sassp({
    file:scssPath,
    outputStyle:'compressed'
  });

  const css = resultCss.css.toString() + (await fs.readFile('../src/css/icons.css','utf-8'));

  //console.log(css);
  
  
  // const md = MarkdownIt({
  //   // don't sanitize html if you want to support AMP components in Markdown
  //   html: true,
  // });
  
  // enable markdown mode
  const ampOptimizer = AmpOptimizer.create({
    markdown: true,
  });
  
  // const markdown = `
  // # Markdown 🤯
  
  // Here is an image declared in Markdown syntax: 
  
  // ![A random image](https://unsplash.it/1024/768)
  
  // You can directly declare AMP components:
  
  // <amp-twitter width="375" 
  //              height="472" 
  //              layout="responsive" 
  //              data-tweetid="1182321926473162752">
  // </amp-twitter>
  
  // Any missing extensions will be automatically imported.
  // `;
  
  const htmlNotCss = template({meta:{debug:debug,contentPath:contentPath}});
  
  const purgeCSSResult = await new PurgeCSS.PurgeCSS().purge({
    content:[{
      raw:htmlNotCss,
      extension:'css'
    }],
    css:[{
      raw:css
    }]
  });

  const html = htmlNotCss.replace('/*@css@*/',purgeCSSResult[0].css);

  //await fs.promises.writeFile('../dist/test.html',html,'utf8');
 
  // valid AMP!
  const amphtml = await ampOptimizer.transformHtml(html, {
    canonical: '.'
  });

  await fs.outputFile(outputPath,amphtml,'utf8');
 }

 async function buildPageFromPath(baseDir){
  
  let p = path.resolve(path.join('../data/contents',baseDir,'page.content'));
  try {
    await fs.stat(p);
  } catch (e) {
    if(e.code == 'ENOENT'){
      p = path.resolve(path.join('../data/contents',baseDir,'page.content.md'));
      await fs.stat(p);
    }
  }
  const output= path.join('../dist',baseDir,'index.html');

  await buildPage({
    templatePath:'../src/templates/template-content.ejs',
    scssPath:'../src/scss/content.scss',
    outputPath:output,
    contentPath:p
  });
 
}

 const pages = [
  { 
    
    templatePath:'../src/templates/template-top.ejs',
    scssPath:'../src/scss/top.scss',
    outputPath:'../dist/top.html'
  },{
    templatePath:'../src/templates/template-top-grid.ejs',
    scssPath:'../src/scss/top-grid.scss',
    outputPath:'../dist/index.html'
  },{
    templatePath:'../src/templates/template-top-menu.ejs',
    scssPath:'../src/scss/top-menu.scss',
    outputPath:'../dist/top-menu.html'
  },'dev/break/'
 ];


 (async ()=>{
  for(const p of pages){
    if(typeof(p) == 'string' || p instanceof String){
      await buildPageFromPath(p);
    } else {
      await buildPage(p);   
    }
   }
})();

