import fs, { stat } from 'fs';
import util from 'util';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';


const computeHash = crypto.createHash('sha256');

const baseDir = '../data/contents/';
const fsp = fs.promises;

(async ()=>{
  const db = new Database('../data/db/sitedata.db');
  db.exec('create table if not exists contents(id text primary key,content_hash text,path text,type text,content text,cache text,created_at int ,updated_at int,flags int default 0 );');
  const insertData = db.prepare('insert into contents(id,content_hash,path,type,content,created_at,updated_at,flags) values(@id,@content_hash,@path,@type,@content,@created_at,@updated_at,1);');
  const updatetData = db.prepare('replace into contents(id,content_hash,path,type,content,created_at,updated_at,flags) values(@id,@content_hash,@path,@type,@content,@created_at,@updated_at,1);');
  const selectData = db.prepare('select id,content_hash,path,updated_at from contents where id = @id;');
  const updateFlag = db.prepare('update contents set flags = 1 where id = @id;');

  // フラグのクリア
  db.exec('update contents set flags  = 0;');

  const filePaths = [];
  async function listFile(baseDir) {
    // .mdディレクトリを再帰的に検索する
    let dirs = await fsp.readdir(baseDir);
    for(const d of dirs) {
      const currentPath = baseDir + d;
      const stats = await fsp.stat(currentPath);
      if (stats.isDirectory() && !d.match(/less|scripts|sh/ig)) {
        await listFile(currentPath + '/');

      } else if (stats.isFile() && d.match(/\.(html?)|(md)$/)) {
        const content = await fsp.readFile(currentPath,'utf8');
        const id = crypto.createHash('sha256').update(currentPath).digest('hex');
        const content_hash = crypto.createHash('sha256').update(content).digest('hex');
        const record = selectData.get({id:id});

        if(record && record.id){
          if((record.content_hash != content_hash) || (record.updated_at != stats.mtimeMs)){
            updatetData.run({id:id,content_hash:content_hash,path:currentPath,type:path.extname(currentPath).toLowerCase(),content:content,created_at:stats.birthtimeMs,updated_at:stats.mtimeMs});
          } else {
            updateFlag.run({id:id});
          }
        } else {
          insertData.run({id:id,content_hash:content_hash,path:currentPath,type:path.extname(currentPath).toLowerCase(),content:content,created_at:stats.birthtimeMs,updated_at:stats.mtimeMs});
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


  await listFile(baseDir);

  // 削除したコンテンツのレコードを削除する
  db.exec('delete from contents where flags = 0;');
  // db.exec('update contents set flags  = 0;');
  db.close();
})();