
import sass from 'node-sass';
import util from 'util';
import fs from 'fs';

const fsp = fs.promises;
const sassp = util.promisify(sass.render.bind(sass));

(async()=>{
  const result = await sassp({
    file:'../src/scss/spectre.scss',
    outputStyle:'compressed'
  });
  console.log(result);
  await fsp.writeFile('../src/css/spectre.css',result.css,'utf8');
})();
