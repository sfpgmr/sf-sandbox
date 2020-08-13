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
  const sampleRate = 8000;
  const memory = new WebAssembly.Memory({initial:1,shared:true,maximum:10});
  let memoryMap = JSON.parse(await fs.promises.readFile('../../build/wpsg.context.json','utf8'));
  const envParam = getOffset(memoryMap.env);
  const envWork = getOffset(memoryMap.env);

  const wpsg = getInstance(await fs.promises.readFile('../../build/wpsg.wasm'), { env: { memory: memory } }).exports;
  wpsg.setRate(sampleRate);
  const envParamView = new DataView(memory.buffer,envParam);
  const envWorkView = new DataView(memory.buffer,envWork);

  envParamView.setFloat32(4,1.0,true);//level
  envParamView.setFloat32(8,0.5,true);// attack_time;
  envParamView.setFloat32(12,0.5,true);// decay_time;
  envParamView.setFloat32(16,0.5,true);// sustain_level;
  envParamView.setFloat32(20,0.5,true);// release_time;

  wpsg.initEnvelope(envParam,sampleRate);
  wpsg.keyOnEnvelope(envWork);

  for(let i = 0,e = (2 * sampleRate) | 0;i < e;++i){
    console.log(wpsg.doEnvelope(envParam,envWork))
  }

  wpsg.keyOffEnvelope(envWork);

  for(let i = 0,e = (0.6 * sampleRate) | 0;i < e;++i){
    console.log(wpsg.doEnvelope(envParam,envWork))
  }


})();


