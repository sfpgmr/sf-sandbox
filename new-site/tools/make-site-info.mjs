import puppeteer from 'puppeteer';
import fs from 'fs';
import resolveHome  from './resolveHome.mjs';
import path from 'path';
const baseDir = resolveHome("~/www/html/contents");
import Database from 'better-sqlite3';
import crypto from 'crypto';
// const computeHash = crypto.createHash('sha256');
// const createHash = crypt.createHash('sha256');

// フォルダ階層のすべてのファイルを取得
async function listFilesRecursive(dir,files = []) {
  const folderItems = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const item of folderItems) {
    if(item.isFile()){
      files.push({
        path:path.join(dir,item.name),
        dir:dir,
        name:item.name,
        ext:path.extname(item.name)
      });
    } else if(item.isDirectory()){
      if(!path.join(dir,item.name).match(/(node_modules)|(new-page\/releases)|\/twitter/))
      await listFilesRecursive(path.join(dir,item.name),files);
    }
  }
  return files;
}

(async ()=>{
  const browser = await puppeteer.launch({headless:true});
  let page = await browser.newPage();
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });
  const files = await listFilesRecursive(baseDir);
  for(const file of files){
    if(file.ext.match(/.html?/)){
      const htmlText = await fs.promises.readFile(file.path,'utf-8');
      console.log(file.path);
      try {
        await page.setContent(htmlText,{timeout:3000});
        try {
          const title = await page.$eval("title",e=>e ? e.textContent: '');
          console.log(title);
         } catch(e) {}

        try {
          const description = await page.$eval("meta[name='description']",e=>e ? e.content: '');
          console.log(description);
        } catch (e){  

        }
        try {
          const h1 = await page.$eval("h1",e=>e ? e.textContent : '');
          console.log(h1);
        } catch (e){  

        }
      } catch (e){
        console.log(e.description);
        page.close();
        page = await browser.newPage();
        page.on('dialog', async dialog => {
          await dialog.dismiss();
        });
        continue;
      }
    }
  }
  // await page.goto('http://localhost:5500/new-page/current/build/');
  // await fs.promises.writeFile('./test.html',await page.content(),'utf-8');
  await browser.close();
})();
