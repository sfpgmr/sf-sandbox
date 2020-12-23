import parser from '../src/js/html-parser.mjs';
import fs from 'fs-extra';

(async ()=>{
  const html = await fs.readFile(process.argv[2],'utf8');
  const parsed = parser.parse(html);
  await fs.writeFile(process.argv[3],JSON.stringify(parsed,null,1),'utf8');
})();