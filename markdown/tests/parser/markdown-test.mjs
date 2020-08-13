import parser from '../../current/src/js/doc-syntax.mjs';
import fs from 'fs';
import path from 'path';
import url from 'url';

(async()=>{
  try {

    // commonmark テストファイルを作る
    const markdowns = JSON.parse(await fs.promises.readFile('./tests/parser/test-dump.json','utf-8'));
    let testSource = 
`import test from "ava";
import fs from 'fs';
import commonmark from 'commonmark';
let markdowns,reader,writer;

function initMarkDownRenderer(){
  reader = new commonmark.Parser();
  writer = new commonmark.HtmlRenderer();
}

function render(markdown){
  return writer.render(reader.parse(markdown));
}

test.before(async t => {
  initMarkDownRenderer();
  markdowns = JSON.parse(await fs.promises.readFile('./tests/parser/test-dump.json','utf-8'));
});
`;
    
    for(let i = 0;i < markdowns.length;++i){
      const m = markdowns[i];
      testSource += 
`test('No.${m.example} ${m.section}',t=>{
  const m = markdowns[${i}];
  t.is(m.html,render(m.markdown));
});
`;
    }

    await fs.promises.writeFile('./tests/parser/commonmark.test.mjs',testSource,'utf-8');

    const dirName = path.dirname(url.fileURLToPath(import.meta.url));
    const mdPath = path.join(dirName,'md');
    let files = await fs.promises.readdir(mdPath);
    const outputDir = path.join(dirName,'output-json');

    files = files
      .filter(f=>(path.extname(f) == '.md' ) && (fs.statSync(path.join(mdPath,f)).isFile()));
    
    for(const f of files){
      const data = parser.parse(await fs.promises.readFile(path.join(mdPath,f),'utf-8'));
      await fs.promises.writeFile(path.join(outputDir,f+'.json'),JSON.stringify(data,null,1),'utf-8');
    }
  } catch (e) {
    console.log(e);
  }
})();
