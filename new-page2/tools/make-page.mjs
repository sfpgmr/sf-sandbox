
import fs from 'fs';
import ejs from 'ejs';

async function listFile(mdDir,basePath) {
  // .mdディレクトリを再帰的に検索する
  let dirs = fs.readdirSync(mdDir);
  dirs.forEach((d) => {
    let mdPath = mdDir + d;
    let stats = fs.statSync(mdPath);
    if (stats.isDirectory() && !d.match(/blog|less|scripts|sh/ig)) {
      listFile(mdPath + '/',basePath);
    } else if (stats.isFile() && d.match(/\.html?$/)) {
      
      sitemap.add(
        {
          url:blogConfig.siteUrl + mdPath.replace(basePath,''),
          changefreq:'weekly',
          priority:0.6,
          lastmodrealtime: true,
          lastmodfile:mdPath            
        }
      );
    }
  });
}

(async () => {
  const fname = "index.html";
  const url = "./" + fname;
  const html = await ejs.renderFile('./current/src/ejs/index.ejs', 
  { meta:{
      title:'リニューアル用のトップページデザイン',
      description:'リニューアル用のトップページデザインを考えて実装する',
      url:url,
      imageUrl:'https://www.sfpgmr.net/img/sfweb.png',
      siteName:'S.F. Web',
      keywords:'Programming,Music,HTML5,WebGL,javascript,WebAudio',
      twitterSite:'@sfpgmr'
    }
  });
  await fs.promises.writeFile(`./current/src/html/${fname}`, html, 'utf8');
})();
