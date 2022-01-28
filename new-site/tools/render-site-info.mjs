import puppeteer from 'puppeteer';
import fs from 'fs';
import resolveHome  from './resolveHome.mjs';
import path from 'path';
import url  from 'url';
const baseDir = resolveHome("~/www/html/contents");
const blogDir = resolveHome("~/www/blog/contents");
import Database from 'better-sqlite3';
import crypto from 'crypto';

const cwd = process.cwd();
const scriptDir = path.dirname(url.fileURLToPath(import.meta.url));
process.chdir(scriptDir);

try  {
  (async ()=>{

    const db = Database("../data/db/site-info.db");
    const query = db.prepare(`
    select s.id as contentId,src.path as contentPath,src.title as contentTitle,src.h1 contentH1,src.description as contentDescription,sim.id as similarContentID,sim.path as similarContentPath,sim.title as similarContentTitle,sim.h1 as similarContentH1,sim.description as similarContentDescription,similarity from contents src 
    left outer join similars s on src.id = s.id 
    left join contents sim on s.similarId = sim.id 
    where similarContentID is not null and similarity > 0.8
    order by s.id,s.similarity desc;
    `);
    const rows = query.all();
    for(const row of rows) {
      row.contentPath = 
      row.contentPath.replace(/\/home\/sfpg\/www\/html\/contents/i,'https://sfpgmr.net');
      row.contentPath = 
      row.contentPath.replace(/\/home\/sfpg\/www\/blog\/contents/i,'https://sfpgmr.net/blog');
      row.similarContentPath = 
      row.similarContentPath.replace(/\/home\/sfpg\/www\/html\/contents/i,'https://sfpgmr.net');
      row.similarContentPath = 
      row.similarContentPath.replace(/\/home\/sfpg\/www\/blog\/contents/i,'https://sfpgmr.net/blog');
    }

    await fs.promises.writeFile(resolveHome("../data/db/site-info.json"),JSON.stringify(rows));
    db.close();
    process.chdir(cwd);
  })();
} catch(e) {
  console.log(e);
  process.chdir(cwd);
  process.abort();
}
