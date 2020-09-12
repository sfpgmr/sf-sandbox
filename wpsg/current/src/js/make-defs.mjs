import fs from 'fs';
(async ()=>{
  const map = JSON.parse(await fs.promises.readFile('../../build/wpsg.context.json','utf8'));
  const out = {};
  for(const i in map){
    const p = map[i];
    if(!(p.type && p.type == 'MacroDefinition')){
      out[i] = p;    
    }
  }
  await fs.promises.writeFile("../../build/wpsg.defs.json",JSON.stringify(out,null,1),'utf-8');
})();