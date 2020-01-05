import fs from 'fs';
import util from 'util';
import path from 'path';
import wwwconfig from '../data/wwwconfig.mjs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

async function listFile(rootDir, dir, files, dirs) {
  if (!dirs) {
    dirs = await fs.promises.readdir(dir);
  }
  // .mdディレクトリを再帰的に検索する
  for (const d of dirs) {
    let p = dir + d;
    let stats = await fs.promises.stat(p);
    if (stats.isDirectory() && !d.match(/img|images|res|blog|less|scripts|sh|css|js|data|media|webpages|tools/ig)) {
      let relativePath = path.relative(rootDir, p);
      const dirObj = {
        isDirectory: true,
        path: relativePath,
        url: wwwconfig.baseUrl + '/' + relativePath,
        children: []
      };
      let dirs = await fs.promises.readdir(p);
      let indexPage = dirs.find(e => e.match(/index\.html?/ig));
      if (indexPage) {
        dirObj.indexPage = indexPage;
      }
      await listFile(rootDir, p + '/', dirObj.children, dirs);
      if (dirObj.children.length) {
        files.push(dirObj);
      }

    } else if (stats.isFile() && d.match(/\.html?$/)) {
      // ホームページ・ルートディレクトリを基準とした相対パスを取得する
      let relativePath = path.relative(rootDir, p);
      let basename = path.basename(d);

      // load dom
      const { window } = await JSDOM.fromFile(p);
      const { document } = window;
      // get meta description
      let description = document.querySelector('meta[name = "description"]');
      description = description ? description.content : undefined;
      // get title tag
      let title = document.querySelector('title');
      title = title ? title.textContent : undefined;
      // get meta keywords
      let keywords = document.querySelector('meta[name = "keywords"]');
      keywords = keywords ? keywords.content : undefined;

      //let about = document.querySelector('body');
      //about = about ? about.textContent.substr(0,128):undefined;
      files.push({
        path: relativePath,
        url: wwwconfig.baseUrl + '/' + relativePath,
        description: description,
        title: title,
        keywords: keywords,
        //about:about
      });
    }
  }
  return files;
}

try {
  (async () => {
    const files = [];
    await listFile(wwwconfig.root, wwwconfig.root, files);
    await fs.promises.writeFile('./data/data.json', JSON.stringify(files, null, 1), 'utf8');
  })();
} catch (e) {
  console.error(e.stack);
}
