import AmpOptimizer from '@ampproject/toolbox-optimizer';
import MarkdownIt from 'markdown-it';
import fs from 'fs';
import ejs from 'ejs';
import buildCss from './build-css.mjs';
import PurgeCSS from 'purgecss';
import sass from 'node-sass';
import util from 'util';

const fsp = fs.promises;
const sassp = util.promisify(sass.render.bind(sass));


(async()=>{
  const template = ejs.compile(await fs.promises.readFile('../src/templates/template-top.ejs','utf8'));
  
  const resultCss = await sassp({
    file:'../src/scss/top.scss',
    outputStyle:'compressed'
  });

  const css = resultCss.css.toString();
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
  
  const htmlNotCss = template({meta:{}});
  
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

  await fs.promises.writeFile('../dist/index.html',amphtml,'utf8');
 

})();

