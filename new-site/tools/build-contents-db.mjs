import sqlite from 'better-sqlite3';
import {siteConfig} from './site-config.mjs';

(async ()=> {
try {
  const db = sqlite(siteConfig.dbPath)

} catch (e) {
  console.log(e);
  process.abort();
}
})();