import fse from 'fs-extra';
import resolveHome from './resolveHome.mjs';
import path from 'path';

(async()=>{
  try {
    let releaseName = process.argv[0];
    let articleList = await fse.readJson('./article-list.json');
    let articles = articleList.find(a=>{
      a.name == releaseName;
    });

    const currDateStr = (new Date()).toISOString();

    if(articles.length){
      a[0].datePublished = currDateStr; 
      a[0].dateModified = currDateStr;
    } else {
      articles.push({name:releaseName,datePublished:currDateStr,dateModified:currDateStr});
    }

    await fse.writeJson('./article-list.json');

  } catch (e) {
    console.error(e);
  }
})();