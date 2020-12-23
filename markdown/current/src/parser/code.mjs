import fs from 'fs';

(async()=>{
  let uc = await fs.promises.readFile('./DerivedGeneralCategory.txt','utf-8');
  uc = uc.replace(/#.*/ig,'').replace(/^\n/igm,'').replace(/\.\./igm,'-').replace(/([a-fA-F0-9]{4,5})/ig,'\\u{$1}').split('\n');
  let out = new Map();
  uc.forEach(d=>{
    d = d.split(';').map(c=>c.trim());
    if(d && d.length){
      if(out.has(d[1])){
        out.get(d[1]).push(d[0]);
      } else {
        out.set(d[1],[d[0]]);
      }
    }
  });
  let grammer = '';
  for(const d of out){
    if(d[0]){
      grammer += d[0] + ' = [' + d[1].join('') + ']\n';
    }
  }
  await fs.promises.writeFile('./unicode_.pegjs',grammer,'utf-8')
})();