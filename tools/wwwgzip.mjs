// gzip.js
import fs from 'fs';
import zlib from 'zlib';
import util from 'util';
import path from 'path';

const gzip = util.promisify(zlib.gzip);
const rootDir = '/home/sfpg/www/html/contents/';
const blogDir = '/home/sfpg/www/blog/contents/';

(async()=>{
  const paths = await fs.promises.readdir(rootDir);
  async function gzipDir(base,paths){
    for(const p of paths ){
      const stat = await fs.promises.stat(base + p);
      if(stat.isFile() && !(/^\./.test(p)) && !(/\.gz$/.test(p))){
        console.log(base + p + '.gz');
        await fs.promises.writeFile (base + p + '.gz',await gzip(await fs.promises.readFile(base + p)));
      } else if(stat.isDirectory()){
        await gzipDir(base + p + '/',await fs.promises.readdir(base + p + '/'));
      }
      
    }
  }
  await gzipDir(rootDir,paths);
  const blogPaths = await fs.promises.readdir(blogDir);
  await gzipDir(blogDir,blogPaths);
})();
