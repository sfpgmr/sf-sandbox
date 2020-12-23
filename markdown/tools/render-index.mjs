import fse from 'fs-extra';
import ejs from 'ejs';
import parser from './article-syntax.mjs';
import path from 'path';
import {AmpRenderer,saveCache} from 'sf-renderer.mjs';
import marked from './marked.mjs';

 
(async()=>{
  try {
    marked.setOptions({
      renderer:AmpRenderer
    });
    const buildPath = process.argv[2];
    const releaseBase = process.argv[3];
    const mdBase = process.argv[4];
    const pageJson = process.argv[5];
    const src = process.argv[6];
    const dest = process.argv[7];
    const releaseName = process.argv[8];

    const pageJson = JSON.parse(await fse.readFile(pageJson,'utf-8'));
    const doc = await fse.readFile(path.join(mdBase,releaseName ? releaseName + '.md' : './default.md'));
    const docJson = parse(doc);
    let bodyHtml;

    if(docJson.body){
      bodyHtml = marked(docJson.body);
    } else {
      bodyHtml = '';
    }

    const page = await ejs.renderFile(src,{page:pageJson,bodyHtml:bodyHtml});
    await fse.writeFile(dest,page,'utf-8');
    console.info(`render src:${src} => render dest:${dest}`);
    if(releaseName){
      const releaseSrc = buildPath;
      console.info(`${buildpath} => ${path.join(releaseBase,releaseName)}`);
      await fse.copy(buildPath,path.join(releaseBase,releaseName),{overwrite:true});
    }
  } catch (e) {
    console.error(e);
    process.abort();
  }
})();
