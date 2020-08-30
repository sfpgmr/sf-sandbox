import AmpOptimizer from '@ampproject/toolbox-optimizer';
import MarkdownIt from 'markdown-it';
import fs from 'fs';
import ejs from 'ejs';
import {}


(async()=>{

  const template = ejs.compile(await fs.promises.readFile('../src/templates/template-base.ejs','utf8'));

  const md = MarkdownIt({
    // don't sanitize html if you want to support AMP components in Markdown
    html: true,
  });
  
  // enable markdown mode
  const ampOptimizer = AmpOptimizer.create({
    markdown: true,
  });
  
  const markdown = `
  # Markdown 🤯
  
  Here is an image declared in Markdown syntax: 
  
  ![A random image](https://unsplash.it/1024/768)
  
  You can directly declare AMP components:
  
  <amp-twitter width="375" 
               height="472" 
               layout="responsive" 
               data-tweetid="1182321926473162752">
  </amp-twitter>
  
  Any missing extensions will be automatically imported.
  `;
  
  const html = template({meta:{},body:md.render(markdown)});
  
  // valid AMP!
  const amphtml = await ampOptimizer.transformHtml(html, {
    canonical: '.'
  });

  await fs.promises.writeFile('../dist/test.html',amphtml,'utf8');
  // await fs.promises.writeFile('../dist/test.html',html,'utf8');


})();

