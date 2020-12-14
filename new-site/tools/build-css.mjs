
import sass from 'node-sass';
import util from 'util';
import fs from 'fs';

const fsp = fs.promises;
const sassp = util.promisify(sass.render.bind(sass));

export default async function buildCss() {
  const result = await sassp({
    file:'../src/css/bulma/bulma.sass',
    outputStyle:'compressed'
  });
  //console.log(result);
  await fsp.writeFile('../src/css/style.css',result.css,'utf8');
  return result.css.toString();
}
