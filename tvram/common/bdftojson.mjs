import fs from 'fs';


(async()=>{
  let bdf = await fs.promises.readFile('./misaki_gothic_2nd.bdf','utf-8');
  let tokens = bdf.split(/\n/);
  let index = 0;
  let out = [];

  let bitmaparray = new Uint8Array(256 * 2048);

  // ENDPROPERTIESまでスキップ
  while(!tokens[index].match(/CHARS\s/)){
    ++index;
  }
  ++index;

  while(index < tokens.length && !tokens[index].match(/ENDFONT/)){
    // フォントビットマップの作成
    const bitmap =[0,0,0,0,0,0,0,0];
    const startchar = tokens[index++].split(/\s/)[1];
    const encoding = parseInt(tokens[index++].split(/\s/)[1]);
    ++index;//swidth
    ++index;//dwidth
    let bbx = tokens[index++].split(/\s/);
    bbx.shift();
    bbx = bbx.map(d=>parseInt(d));
    const offsetX = bbx[2];
    const offsetY = bbx[3];
    ++index;//BITMAP
    let bindex = offsetY;
    while(!tokens[index].match(/ENDCHAR/)){
      let b = parseInt(tokens[index++],16);
      bitmap[bindex++] = offsetX > 0 ? b >>> offsetX : b << (Math.abs(offsetX) | 0);
    }
    out.push({
      encoding:encoding,
      bitmap:bitmap,
      startchar:startchar
    });
    ++index;
  }

  //バイナリデータ化
  for(const c of out){
    let offsetX = c.encoding % 256;
    let offsetY = (c.encoding >> 8) << (3 + 8); 
    for(let i = 0;i < 8;++i){
      bitmaparray[offsetX + offsetY + (i<<8)] = c.bitmap[i];
    }
  }

  //await fs.promises.writeFile('./font.json',JSON.stringify(out,null,1),'utf8');
  await fs.promises.writeFile('./font-b.bin',bitmaparray);

})();


