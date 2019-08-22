"use strict";
const fs = require('fs');
function getInstance(obj, imports = {}) {
  const bin = new WebAssembly.Module(obj);
  const inst = new WebAssembly.Instance(bin, imports);
  return inst;
}

function getOffset(prop){
  return prop._attributes_.offset;
}

function getSize(prop){
  return prop._attributes_.size;
}

(async () => {
      // 100ms分のバッファサイズを求める
      let audioBufferSize = Math.pow(2,Math.ceil(Math.log2(audioctx.sampleRate * 4 * 0.1 )));
      let pageSize = Math.ceil((audioBufferSize + getSize(memoryMap)) / 65536);
      const memory = new WebAssembly.Memory({initial:pageSize,shared:true,maximum:10});
  let memoryMap = await fetch('../../current/build/wpsg.context.json');
      memoryMap = await memoryMap.json();

  const wpsg = getInstance(await fs.promises.readFile('../../current/build/wpsg.wasm')).exports;
  wpsg.setRate(44100);

  psg.init(1790000, 4000);
  psg.reset();
  psg.setQuality(0);
  psg.setVolumeMode(0);

  psg.writeReg(0, 0x5d);
  psg.writeReg(1, 0xd);
  psg.writeReg(2, 0x5d);
  psg.writeReg(3, 0x1);
  psg.writeReg(4, 0x5d);
  psg.writeReg(5, 0x2);
  psg.writeReg(7, 0b111110);
  psg.writeReg(6, 0x10);
  psg.writeReg(13, 0b1001);
  psg.writeReg(11,150);
  psg.writeReg(12,2);
  psg.writeReg(8, 0b010000);

  const v = new DataView(psg.memory.buffer);
  function p(o,l='',r=16){
    return l+(v.getUint32(o,true)).toString(r);
  }
  for (let i = 0; i < 65536; ++i) {
    console.log(p(560,"ch_out:"),p(400,'ba:'),p(484,'bc:',),psg.calc(),p(492,'ptr:'),p(496,'face:'),p(500,'continue:'),p(504,'attack:'),p(508,'alt:'),p(512,'hold:'),p(516,'pause::'),p(520,'reset:'),p(524,'freq:'),p(528,'env_count:'),p(488,'volume:'));
    
  }
})();


