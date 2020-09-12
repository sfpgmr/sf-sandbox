import zlib from 'zlib';
import {URL} from 'url';
import path from 'path';
import fs from 'fs-extra';

import util from 'util';
import sm from 'sitemap';
import wwwconfig from '../data/wwwconfig.mjs';

// サイトマップの生成
async function generateSiteMap(docs,urls,archiveDate)
{
  const sitemap = sm.createSitemap({
    cacheTime: 600000,
    urls:urls
  });


 let filePaths = [];
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

  await listFile(blogConfig.wwwRootDir,blogConfig.wwwRootDir);

  // sitemap index 
  const outPathSmi = blogConfig.wwwRootDir + 'sitemap-web.xml';
  await fs.outputFile(outPathSmi,sitemap.toString(),'utf-8');
  await compressGzip(outPathSmi);
}

function compressGzip(path) {
  // gzipファイルを作成する
  return new Promise((resolve, reject) => {
    var out = fs.createWriteStream(path + '.gz');
    out.on('finish', resolve.bind(null));

    fs.createReadStream(path)
      .pipe(zlib.createGzip({ level: zlib.Z_BEST_COMPRESSION }))
      .pipe(out);
    out = void (0);
  });
}

generateSiteMap();

