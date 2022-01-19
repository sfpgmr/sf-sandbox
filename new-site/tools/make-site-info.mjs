import puppeteer from 'puppeteer';
import fs from 'fs';
import resolveHome from './resolveHome.mjs';
import path from 'path';
import url from 'url';
import Mecab from 'mecab-async';
const baseDir = resolveHome("~/www/html/contents");
const blogDir = resolveHome("~/www/blog/contents");
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { MeshToonMaterial } from 'three';
// const computeHash = crypto.createHash('sha256');
// const createHash = crypt.createHash('sha256');

// フォルダ階層のすべてのファイルを取得
async function listFilesRecursive(dir, baseDir,baseUrl,files = []) {
  const folderItems = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const item of folderItems) {
    if (item.isFile()) {
      if (!item.name.match(/\.amp\.html/)) {
        const p = path.join(dir, item.name);
        files.push({
          url: p.replace(baseDir, baseUrl),
          path: p,
          dir: dir,
          name: item.name,
          ext: path.extname(item.name)
        });
      }
    } else if (item.isDirectory()) {
      if (!path.join(dir, item.name).match(/(node_modules)|(new-page\/releases)|\/twitter|\/archive/)) {
        await listFilesRecursive(path.join(dir, item.name),baseDir,baseUrl,files);
      }
    }
  }
  return files;
}

const domain = "https://sfpgmr.net";

function getNormalizedUrl(url){
  url = url.replace(/https?\:\/\/www.sfpgmr.net/,domain)
    .replace(/https?\:\/\/blog.sfpgmr.net/,domain + '/blog')
    .replace(/https?\:\/\/alter.sfpgmr.net/,domain );
  if(url.slice(-1) === '/'){
    url += 'index.html';
  }
  return new URL(url,domain);
}

const cwd = process.cwd();
const scriptDir = path.dirname(url.fileURLToPath(import.meta.url));
console.log(scriptDir);
process.chdir(scriptDir);

try {
  (async () => {
    // Mecabを初期化
    const mecab = new Mecab();
    // Neologdを使うようにする
    mecab.command = '/usr/bin/mecab -b 655360 -d /usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd';

    // Puppeteerの起動
    const browser = await puppeteer.launch({ headless: true });
    // pageを起動
    let page = await browser.newPage();
    page.setDefaultNavigationTimeout(10000);
    page.setDefaultTimeout(10000);
    // alertダイアログが開いたら閉じる
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    // ページ情報を巡回して取得する
    const files = [];
    await listFilesRecursive(baseDir,baseDir,"https://sfpgmr.net",files);
    await listFilesRecursive(blogDir,blogDir,"https://sfpgmr.net/blog",files);
    const pageLists = [];
    if (process.argv[2] === '--delete-db') {
      console.info("site-info.dbを削除します");
      try {
        await fs.promises.unlink(resolveHome("../data/db/site-info.db"));
      } catch (e) {
        console.info(e.description);
      }
    }
    const db = Database(":memory:");
    // コンテンツテーブルの作成
    db.exec(`
      CREATE TABLE IF NOT EXISTS contents (
        id INTEGER PRIMARY KEY Autoincrement,
        url TEXT,
        path TEXT,
        dir TEXT,
        name TEXT,
        ext TEXT,
        title TEXT,
        description TEXT,
        keywords TEXT,
        h1 TEXT,
        bodyText TEXT,
        content TEXT,
        contentHash TEXT,
        separatedContent Text,
        similars TEXT,
        datePublished datetime,
        dateModified datetime,
        updated_at datetime default current_timestamp,
        created_at datetime default current_timestamp);
    `);

    // ページ内のURLを
    db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY Autoincrement,
        contentId INTEGER,
        type TEXT,
        url TEXT,
        protocol TEXT,
        host TEXT,
        pathname TEXT,
        search TEXT,
        alt TEXT,
        rel TEXT,
        name TEXT,
        isError INTEGER,
        data TEXT,
        updated_at datetime default current_timestamp,
        created_at datetime default current_timestamp );
    `);

    // const upsert = db.prepare(`
    //       insert or ignore into contents(url,path,dir,name,ext,title,description,h1,bodyText,content,hash,separatedContent) values (@url,@path,@dir,@name,@ext,@title,@description,@h1,@bodyText,@content,@hash,@separatedContent);
    //   `);

    const insertFile = db.prepare(`
      insert or ignore into contents(url,path,dir,name,ext) values (@url,@path,@dir,@name,@ext);
    `);

    const updateInfo = db.prepare(`
      update contents set title = @title,description = @description,h1 = @h1,bodyText = @bodyText,content = @content,contentHash = @contentHash,separatedContent = @separatedContent where id = @id;
    `);

    const insertUrl = db.prepare(`insert or ignore into urls(contentId,type,url,protocol,host,pathname,search) values (@contentId,@type,@url,@protocol,@host,@pathname,@search);`);

    const insertUrlParam = db.prepare(`insert or ignore into urls(contentId,type,url,protocol,host,pathname,search,alt,rel,name,isError,data) values (@contentId,@type,@url,@protocol,@host,@pathname,@search,@alt,@rel,@name,@isError,@data);`);

    const insertLink = db.prepare(`insert or ignore into urls(contentId,type,url,protocol,host,pathname,search,rel) values (@contentId,@type,@url,@protocol,@host,@pathname,@search,@rel);`);

    (db.transaction((files) => {
      for (const file of files) {
        insertFile.run(file);
      }
    }))(files);

    const contents = db.prepare(`select * from contents;`).all();

    await db.transaction(async () => {
      for (const contentInfo of contents) {
        if (contentInfo.ext.match(/.html?/)) {
          const content = await fs.promises.readFile(contentInfo.path, 'utf-8');
          const pageInfo = { id: contentInfo.id };
          try {
            await page.setContent(content);
            // Title //
            try {
              const title = await page.$eval("title", e => e ? e.textContent : '');
              pageInfo.title = title;
            } catch (e) {
              pageInfo.title = '';
            }

            // Meta Description //
            try {
              const description = await page.$eval("meta[name='description']", e => e ? e.content : '');
              pageInfo.description = description;
            } catch (e) {
              pageInfo.description = '';
            }

            // h1 //
            try {
              const h1 = await page.$eval("h1", e => e ? e.textContent : '');
              pageInfo.h1 = h1;
            } catch (e) {
              pageInfo.h1 = '';
            }
            // body text //
            pageInfo.bodyText = await page.$eval("body", e => e ? e.textContent : '');
            // content //
            pageInfo.content = content;
            // content のハッシュ値 //
            pageInfo.contentHash = crypto.createHash('sha256').update(pageInfo.content).digest('hex');
            // mecabで分かち書き
            try {
              const wakachiSource = (pageInfo.title + pageInfo.description + pageInfo.h1 + pageInfo.bodyText).replace(/{\r\n}+/g, '\n').replace(/{ \t}+/g, ' ') + '\n';
              const separatedContent = (await mecab.wakachiSync(wakachiSource)).filter(e => e.length > 0 && !e.match(/EOS/));
              pageInfo.separatedContent = JSON.stringify(separatedContent);
            } catch (e) {
              console.log(contentInfo.id,e);
              pageInfo.separatedContent = null;
            }
            updateInfo.run(pageInfo);

            // content内のタグのURLを取得 //

            // a href//
            const anchors = await page.$$("a");
            for (const anchor of anchors) {
              const h = await anchor.evaluate(e => e.href);
              if (h && h.length > 0) {
                const urlHref = getNormalizedUrl(h);
                insertUrl.run({
                  contentId: contentInfo.id,
                  type: "a",
                  url: urlHref.href,
                  protocol: urlHref.protocol,
                  host: urlHref.host,
                  pathname: urlHref.pathname,
                  search: urlHref.search
                });
              }
            }

            // img src //
            const images = await page.$$("img");
            for (const image of images) {
              const imgSrc = await image.evaluate(e => e.src);
              if (imgSrc && imgSrc.length > 0) {
                const imgSrcUrl = getNormalizedUrl(imgSrc);
                insertUrl.run({
                  contentId: contentInfo.id,
                  type: "img",
                  url: imgSrcUrl.href,
                  protocol: imgSrcUrl.protocol,
                  host: imgSrcUrl.host,
                  pathname: imgSrcUrl.pathname,
                  search: imgSrcUrl.search
                });
              }
            }

            // script src //
            const scripts = await page.$$("script");
            for (const script of scripts) {
              const scriptSrc = await script.evaluate(e => e.src);
              if (scriptSrc && scriptSrc.length > 0) {
                const scriptSrcUrl = getNormalizedUrl(scriptSrc);
                insertUrl.run({
                  contentId: contentInfo.id,
                  type: "script",
                  url: scriptSrcUrl.href,
                  protocol: scriptSrcUrl.protocol,
                  host: scriptSrcUrl.host,
                  pathname: scriptSrcUrl.pathname,
                  search: scriptSrcUrl.search
                });
              } else {
                const type = await script.evaluate(e => e.type);
                if(type &&  type == 'application/ld+json'){
                  const json = await script.evaluate(e => e.innerText);
                  if(json && ((json instanceof String) || (typeof(json) == 'string'))){
                    const jsonLd = JSON.parse(json);
                    insertUrlParam.run({
                      contentId: contentInfo.id,
                      url: null,
                      protocol: null,
                      host: null,
                      pathname: null,
                      search: null,
                      rel:null,
                      alt:null,
                      isError:0,
                      name:null,
                      type: "json-ld",
                      data:json
                    });
                  }
                }
              }
            }

            // link href //
            const links = await page.$$("link");
            for (const link of links) {
              const linkHref = await link.evaluate(e => e.href);
              const rel = await link.evaluate(e => e.rel);
              if (linkHref && linkHref.length > 0) {
                const linkHrefUrl = getNormalizedUrl(linkHref);
                insertLink.run({
                  contentId: contentInfo.id,
                  type: "link",
                  url: linkHrefUrl.href,
                  protocol: linkHrefUrl.protocol,
                  host: linkHrefUrl.host,
                  pathname: linkHrefUrl.pathname,
                  search: linkHrefUrl.search,
                  rel:rel
                });
              }
            }

            // iframe  //
            const iframes = await page.$$("iframe");
            for (const iframe of iframes) {
              const iframeSrc = await iframe.evaluate(e => e.src);
              if (iframeSrc && iframeSrc.length > 0) {
                const iframeSrcUrl = getNormalizedUrl(iframeSrc);
                insertUrl.run({
                  contentId: contentInfo.id,
                  type: "iframe",
                  url: iframeSrcUrl.href,
                  protocol: iframeSrcUrl.protocol,
                  host: iframeSrcUrl.host,
                  pathname: iframeSrcUrl.pathname,
                  search: iframeSrcUrl.search
                });
              }
            }


          } catch (e) {
            console.log(contentInfo.id,e);
            page.close();
            page = await browser.newPage();
            page.setDefaultNavigationTimeout(10000);
            page.setDefaultTimeout(10000);
            page.on('dialog', async dialog => {
              await dialog.dismiss();
            });
            continue;
          }
        }
      }
    })();
    // await page.goto('http://localhost:5500/new-page/current/build/');
    // await fs.promises.writeFile('./test.html',await page.content(),'utf-8');
    await fs.promises.writeFile('../data/db/site-info.db', db.serialize());
    db.close();
    await browser.close();
    process.chdir(cwd);
  })();
} catch (e) {
  console.log(e);
  process.chdir(cwd);
  process.abort();
}
