import fs from 'fs-extra';
import { stat } from 'fs';
import util from 'util';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { siteConfig, blogConfig } from './site-config.mjs';
import marked from './marked.mjs';
import { clone, exec, spawn, toISOString, compressGzip } from './sf_util.mjs';
import { JSDOM } from 'jsdom';
import hljs from 'highlight.js';


// markedオプションの設定
marked.setOptions({
  highlight: (code, lang = '') => {
    // syntax highlightの設定
    // コンテンツ生成時に埋め込む
    try {
      let v = hljs.highlight(lang, code).value;
      return v;
    } catch (e) {
      //console.log(e,e.stack);
    }
    return code;
  },
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  renderer:new NormalRenderer()
});

const computeHash = crypto.createHash('sha256');

const contentsDirs = siteConfig.contentsDirs;
const dbPath = siteConfig.dbPath;
const createHash = crypt.createHash('sha256');

if (process.argv[2] == 'reset') {
  fs.unlinkSync(dbPath);
}
const db = Database(dbPath);

// データベースのセットアップ
db.exec(`
create table if not exists contents
  ( id text primary key,
    path text,
    contentHash text,
    blog int,
    type text,
    contentPath text,
    url text,
    headline text,
    keywords text,
    datePublished datetime,
    dateModified datetime,
    draft int,
    createdAt int,
    updatedAt int,
    flags int default 0
    );`
);

const insertData = db.prepare(`
insert into contents(
  id,path,contentHash,blog,type,contentPath,url,headline,keywords,datePublished,dateModified,draft,createdAt,updatedAt,flags) 
  values(@id,@path,@contentHash,@blog,@type,@contentPath,@url,@headline,@keywords,@datePublished,@dateModified,@draft,@createdAt,@updatedAt,1);`
);

const replaceData = db.prepare(`
replace into contents((id,path,contentHash,blog,type,contentPath,url,headline,keywords,datePublished,dateModified,draft,createdAt,updatedAt,flags) 
  values(@id,@path,@contentHash,@blog,@type,@contentPath,@url,@headline,@keywords,@datePublished,@dateModified,@draft,@createdAt,@updatedAt,1);
`);
const selectData = db.prepare('select * from contents where id = @id;');
const updateFlag = db.prepare('update contents set flags = 1 where id = @id;');



async function createOrUpdateContents(id, record, currentPath, stat) {
  // ファイル拡張子を取得
  const type = path.extname(currentPath).toLowerCase();
  let content_path = currentPath.replace(contentDir.basePath || contentDir.path, contentDir.blog ? siteConfig.destnationBlogPath : siteConfig.destnationPath);
  content_path = content_path.replace(/\.md$/, '.html');

  const content = await fs.readFile(currentPath, 'utf8');
  // 内容が更新されている
  if (type == '.md') {
    // markdown
    const tokens = marked.lexer(content);
    const config = blogConfig['json-ld'];
    const contentHash = createHash.update(content).digest('hex');
    if (!record || record.contentHash != contentHash) {
      if (record && record.draft == 1) {
        // ドラフトバージョンは何もしない
        return;
      }
      let blogPosting = {};
      let headline = '';
      let meta;

      let dateModified; //= (record && record.dateModified && Date.parse(record.dateModified)) ||  new Date(stat.mtimeMs);
      let datePublished;//= (record && record.datePublished && Date.parse(record.datePublished)) || new Date(stat.birthtimeMs);
      let url;

      let keyword;

      if (tokens[0].type == 'heading') {
        headline = tokens[0].text;
        tokens.shift();
      }
      // 属性の取り出し(json-ld)
      if (tokens[0].type == 'html' || tokens[0].type == 'paragraph') {
        let attr = (/<script\s+.*?id=['"]?sfblog['"]?.*?>([\s\S]*?)<\/script>/ig).exec(tokens[0].text);
        //console.log(attr[1]);
        if (attr && attr[1]) {

          meta = JSON.parse(attr[1]);

          // 公開日付の更新
          if (meta.datePublished == 'draft') {
            // ドラフト版は何もしない
            return;
          }

          if (meta.datePublished) {
            if (!record || !record.datePublished) {
              datePublished = Date.parse(meta.datePublished);
            } else {
              datePublished = Date.parse(record.datePublished);
            }
          } else {
            datePublished = (record && record.datePublished && Date.parse(record.datePublished)) || new Date(stat.birthtimeMs);
          }

          // 更新日付の更新
          if (meta.dateModified) {
            if (!record || !record.datePublished) {
              dateModified = Date.parse(meta.datePublished);
            } else {
              dateModified = Date.parse(record.datePublished);
            }
          } else {
            dateModified = (record && record.datePublished && Date.parse(record.datePublished)) || new Date(stat.birthtimeMs);
          }

          // json-ldのデフォルト値とマージし、コンテンツ埋め込み用のメタデータを作成する
          let t = clone(config['sf:siteConfig']['sf:articleDefaults']);
          blogPosting = Object.assign(t, meta.blogPosting);
          if (tokens[0].type == 'html') {
            tokens.shift();
          } else {
            tokens[0].text = tokens[0].text.replace(attr[0], '');
          }
          blogPosting.headline = headline;
        }
      }
      if (!meta && !headline) {
        // 普通の.mdファイル
      } else {
        // 独自フォーマット.mdファイル
      }
    }
  } else {
    // html
    const contentHash = createHash.update(content).digest('hex');
    if (!record || record.contentHash != contentHash) {
      const contentPath = currentPath.replace(contentDir.basePath || contentDir.path, siteConfig.destnationPath);
      // ファイルをコピーする
      await fs.copyFile(currentPath, contentPath);
    }
  }
  // dbのレコードを追加もしくは更新
  replaceData.run({
    id: id, path: currentPath, blog: contentDir.blog ? 1 : 0, type: type, contentPath: contentPath, createdAt: stats.birthtimeMs, updatedAt: stats.mtimeMs
  });
}

async function listFile(contentDir) {
  // ディレクトリを再帰的に検索する
  let dirs = await fs.readdir(contentDir.path);
  for (const d of dirs) {
    const currentPath = path.join(contentDir.path, d);
    const stat = await fs.stat(currentPath);
    if (stat.isDirectory() && !d.match(/less|scripts|sh/ig)) {
      await listFile({ blog: contentDir.blog, basePath: contentDir.basePath ? contentDir.basePath : contentDir.path, path: path.join(currentPath, '/') });
    } else if (stat.isFile() && d.match(/\.(html?)|(md)$/)) {
      createOrUpdateContents(currentPath);
      // 通常コンテンツ
      const id = createHash.update(currentPath).digest('hex');
      //const content_hash = crypto.createHash('sha256').update(content).digest('hex');
      const record = selectData.get({ id: id });

      if (record && record.id) {
        if ((record.updated_at != stats.mtimeMs)) {
          await createOrUpdateContents(id, record, currentPath, stat);
        } else {
          updateFlag.run({ id: id });
        }
      } else {
        await createOrUpdateContents(id, record, currentPath, stat);
      }

      // sitemap.add(
      //   {
      //     url:blogConfig.siteUrl + mdPath.replace(basePath,''),
      //     changefreq:'weekly',
      //     priority:0.6,
      //     lastmodrealtime: true,
      //     lastmodfile:mdPath            
      //   }
      // );
    }
  }
}

(async () => {
  try {

    // フラグのクリア

    db.exec('BEGIN');
    db.exec('update contents set flags  = 0;');
    const filePaths = [];

    for (const contentDir of contentsDirs) {
      await listFile(contentDir);
    }


    // 削除したコンテンツのレコードを削除する
    db.exec('delete from contents where flags = 0;');
    // db.exec('update contents set flags  = 0;');
    db.exec('COMMIT');
  } catch (e) {
    console.error(e);
    db.exec('ROLLBACK');
    db.close();
    process.abort();
  }
  db.exec('VACUUM');
  db.close();
})();
