(function () {
  'use strict';

  //The MIT License (MIT)

  // ブラウザのチェック
  function checkBrowser() {
    let userAgent = window.navigator.userAgent.toLowerCase();
    let currentBrowser = '';

    if (userAgent.indexOf('msie') != -1 ||
      userAgent.indexOf('trident') != -1) {
      currentBrowser = 'trident';
    } else if (userAgent.indexOf('edge') != -1) {
      currentBrowser = 'edge';
    } else if (userAgent.indexOf('chrome') != -1) {
      currentBrowser = 'chrome';
    } else if (userAgent.indexOf('safari') != -1) {
      currentBrowser = 'safari';
    } else if (userAgent.indexOf('firefox') != -1) {
      currentBrowser = 'firefox';
    } else if (userAgent.indexOf('opera') != -1) {
      currentBrowser = 'opera';
    } else {
      currentBrowser = 'unknown';
    }
    return currentBrowser;
  }

  let browser = checkBrowser();

  if(browser !== 'chrome'){
    alert('このページで使用する機能をサポートしていません。');
  }

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

  window.addEventListener('load', async () => {
   // 100ms分のバッファサイズを求める
   const sampleRate = 16000;
   const memory = new WebAssembly.Memory({initial:1,shared:true,maximum:10});
   let memoryMap = await (await fetch('./wpsg.context.json')).json();
   const envParam = getOffset(memoryMap.env);
   const envWork = getOffset(memoryMap.env_work);

   const wpsg = getInstance(await (await fetch('./wpsg.wasm')).arrayBuffer(), { env: { memory: memory } }).exports;
   wpsg.setRate(sampleRate);
   
  //  const envParamView = new DataView(memory.buffer,envParam);

  //  envParamView.setFloat32(4,1.0,true);// ouput level
  //  envParamView.setFloat32(8,0.5,true);// attack_time;
  //  envParamView.setFloat32(12,0.5,true);// decay_time;
  //  envParamView.setFloat32(16,0.5,true);// sustain_level;
  //  envParamView.setFloat32(20,0.5,true);// release_time;

  //  wpsg.initEnvelope(envParam,sampleRate);
  //  wpsg.keyOnEnvelope(envWork);

  //  for(let i = 0,e = (2 * sampleRate) | 0;i < e;++i){
  //    console.log(wpsg.doEnvelope(envParam,envWork));
  //  }

  //  wpsg.keyOffEnvelope(envWork);

  //  for(let i = 0,e = (0.6 * sampleRate) | 0;i < e;++i){
  //    console.log(wpsg.doEnvelope(envParam,envWork));
  //  }

   const offset_start = getOffset(memoryMap.offset_start);
   const waveFormParam = new DataView(memory.buffer,offset_start);
   const waveTable = new DataView(memory.buffer,getSize(memoryMap.WaveFormParam) + offset_start);
   const waveTableWork =new DataView(memory.buffer,waveTable.byteOffset + getSize(memoryMap.WaveTable) + (32 - 1) * 4);
   // WaveFormParamの設定
   wpsg.initWaveFormParam(waveFormParam.byteOffset,0b000,waveTable.byteOffset,440);
   // waveTableの設定
   waveTable.setInt32(getOffset(memoryMap.WaveTable.size),32,true);
   waveTable.setInt32(getOffset(memoryMap.WaveTable.wave_size_mask),32-1,true);
   // 波形データの設定
   let start_offset = getOffset(memoryMap.WaveTable.wave_data_start) ;
   // sin波形を設定
   for(let i = 0;i < 32;++i){
      waveTable.setFloat32(start_offset + i * 4,Math.sin(2 * Math.Pi * (i / 32)),true);
   }

   // WaveTableWorkの初期化
   wpsg.initWaveTableWork(waveFormParam.byteOffset,waveTableWork.byteOffset);

   // 波形生成
   for(let i = 0;i < sampleRate;++i){
     console.log(wpsg.readWaveTable(
      waveTableWork.byteOffset,
      waveFormParam.byteOffset
     ));
   }


    // {
    //   let psg = (await WebAssembly.instantiateStreaming(fetch('./psg.wasm'))).instance.exports;
    //   psg.init(3580000, 44100);
    //   psg.reset();
    //   psg.setRate(44100);
    //   psg.setQuality(1);
    //   psg.setVolumeMode(1);
    //   let a = psg.setMask(0xff);
    //   console.log(a);
    //   let b = psg.toggleMask(0);
    //   console.log(a == b);
    //   psg.reset();
    //   console.log(psg.readIo());
    //   //console.log(psg.writeIO);
    //   //console.log(psg.writeIO);
    //   for (let i = 0; i < 16; ++i) {
    //     psg.writeReg(i, i);
    //     console.log(i, psg.readReg(i), i == psg.readReg(i));
    //   }
    //   //debugger;
    //   psg.writeReg(0, 0x5d);
    //   psg.writeReg(1, 0xd);
    //   psg.writeReg(2, 0x5d);
    //   psg.writeReg(3, 0x1);
    //   psg.writeReg(4, 0x5d);
    //   psg.writeReg(5, 0x2);
    //   psg.writeReg(6, 0x10);
    //   psg.writeReg(12, 2);
    //   psg.writeReg(13, 0b1001);
    //   psg.writeReg(8, 0b10000);
    //   psg.writeReg(7, 0b111110);
    //   for (let i = 0; i < 256; ++i) {
    //     console.log(psg.calc());
    //   }
    // }

    // let psg,psgBin,memoryMap,psgWorker,audioctx,wasmModule,wasmFuncs;
    // let play = false;
    // let vol;
    // let enable = 0x3f;
    // let envShape = 0;
    // const littleEndian = checkEndian();
    // const startButton = document.getElementById('start');
    // let inputs = document.querySelectorAll('input');

    // for (const i of inputs) {
    //   i.disabled = 'disabled';
    // }

    // window.addEventListener("unload",()=>{
    //   if(psgWorker){
    //     psgWorker.terminate();
    //   }
    //   if(audioctx){
    //     audioctx.close();
    //   }
    // });

    // ['A', 'B', 'C'].forEach((ch, i) => {
    //   // Tone
    //   const period = document.getElementById(ch + '-Period');
    //   period.addEventListener('input', function () {
    //     document.getElementById(ch + '-Period-Text').innerText = this.value;
    //     wasmFuncs.writeReg(i * 2, this.value & 0xff);
    //     wasmFuncs.writeReg(i * 2 + 1, (this.value & 0xf00) >> 8);
    //   });
      

    //   // Noise On/OFF
    //   const noise = document.getElementById('Noise-' + ch);
    //   noise.addEventListener('click', function () {
    //     const m = (1 << (i + 3)) ^ 0x3f;
    //     let v = ((this.checked ? 0 : 1) << (i + 3));
    //     enable = (enable & m) | v;
    //     wasmFuncs.writeReg(7, enable);
    //   });

    //   // Tone On/OFF
    //   const tone = document.getElementById('Tone-' + ch);
    //   tone.addEventListener('click', function () {
    //     const m = (1 << i) ^ 0x3f;
    //     let v = ((this.checked ? 0 : 1) << i);
    //     enable = (enable & m) | v;
    //     wasmFuncs.writeReg(7, enable);
    //   });


    //   // Volume 
    //   const volume = document.getElementById('Volume-' + ch);
    //   volume.addEventListener('input', function () {
    //     document.getElementById('Volume-' + ch + '-Text').innerText = this.value;
    //     let v = document.getElementById('Env-' + ch).checked ? 16 : 0 | this.value;
    //     wasmFuncs.writeReg(8 + i, v);
    //   });

    //   // Envelope On/Off
    //   const env = document.getElementById('Env-' + ch);
    //   env.addEventListener('click', function () {
    //     let v = this.checked ? 16 : 0;
    //     v = v | volume.value;
    //     wasmFuncs.writeReg(8 + i, v);
    //   });

    // });

    // // Noise Period

    // const noise = document.getElementById('Noise-Period');
    // noise.addEventListener('input', function () {
    //   document.getElementById('Noise-Period-Text').innerText = this.value;
    //   wasmFuncs.writeReg(6, this.value);
    // });

    // // Enevlope Period

    // const envPeriod = document.getElementById('Env-Period');
    // envPeriod.addEventListener('input', function () {
    //   document.getElementById('Env-Period-Text').innerText = this.value;
    //   wasmFuncs.writeReg(11, this.value & 0xff);
    //   wasmFuncs.writeReg(12, (this.value & 0xff00) >> 8);
    // });

    // // Envelope Shape

    // ['Continue', 'Attack', 'Alternate', 'Hold'].reverse().forEach((p, i) => {
    //   const param = document.getElementById(p);
    //   param.addEventListener('click', function () {
    //     let m = (1 << i) ^ 0xf;
    //     let v = (this.checked ? 1 : 0) << i;
    //     envShape = (envShape & m) | v;
    //     wasmFuncs.writeReg(13, envShape);
    //   });
    // });

    // startButton.addEventListener('click', async () => {

    //   if (!psg) {
    //     // Shared Memoryの利用
    //     // wasmバイナリの読み込み
    //     psgBin = await (await fetch('./wpsg.wasm')).arrayBuffer();
        
    //     memoryMap = await fetch('./wpsg.context.json');
    //     memoryMap = await memoryMap.json();
        

    //     function getOffset(prop){
    //       return prop._attributes_.offset;
    //     }

    //     function getSize(prop){
    //       return prop._attributes_.size;
    //     }

    //     audioctx = new AudioContext();
    //     // 100ms分のバッファサイズを求める
    //     let audioBufferSize = Math.pow(2,Math.ceil(Math.log2(audioctx.sampleRate * 4 * 0.1 )));
    //     let pageSize = Math.ceil((audioBufferSize + getSize(memoryMap)) / 65536);
    //     const memory = new WebAssembly.Memory({initial:pageSize,shared:true,maximum:10});
        
    //     wasmModule = new WebAssembly.Module(psgBin);
    //     wasmFuncs = (new WebAssembly.Instance(wasmModule, { env: { memory: memory } })).exports;
    

    //     const ia = new Int32Array(memory.buffer);
    //     Atomics.store(ia,getOffset(memoryMap.buffer_size) >> 2,audioBufferSize);
    //     //nt32(getOffset(memoryMap.buffer_size) >> 2,audioBufferSize,true);
      
    //     await audioctx.audioWorklet.addModule("./wpsg.js");
    //     psg = new AudioWorkletNode(audioctx, "PSG", {
    //       outputChannelCount: [2]
    //     });

    //     psgWorker = new Worker('./wpsg-worker.js');
    //     psgWorker.onmessage = function (e) {
    //       console.log(e.data);
    //     };

    //     psgWorker.onerror = function(e){
    //       console.log(e);
    //     }


    //     psg.port.postMessage({
    //       message:'init',
    //       memory:memory,
    //       bufferStart:getOffset(memoryMap.buffer_start),
    //       readOffset:getOffset(memoryMap.read_offset),
    //       writeOffset:getOffset(memoryMap.write_offset),
    //       bufferSize:getOffset(memoryMap.buffer_size),
    //       sampleRate:audioctx.sampleRate,
    //       endian:littleEndian
    //     });

    //     psgWorker.postMessage({
    //       message:'init',
    //       wasmBinary:psgBin,
    //       memory:memory,
    //       bufferStart:getOffset(memoryMap.buffer_start),
    //       readOffset:getOffset(memoryMap.read_offset),
    //       writeOffset:getOffset(memoryMap.write_offset),
    //       bufferSize:getOffset(memoryMap.buffer_size),
    //       clock:17900000,
    //       sampleRate:audioctx.sampleRate,
    //       endian:littleEndian
    //     });

    //     // psgWorker.writeReg = (function (reg, value) {
    //     //   this.postMessage(
    //     //     {
    //     //       message: 'writeReg', reg: reg, value: value
    //     //     }
    //     //   )
    //     // }).bind(psgWorker);



    //     // psgWorker.writeReg(0, 0x5d);
    //     // psgWorker.writeReg(1, 0xd);
    //     // psgWorker.writeReg(2, 0x5d);
    //     // psgWorker.writeReg(3, 0x1);
    //     // psgWorker.writeReg(4, 0x5d);
    //     // psgWorker.writeReg(5, 0x2);
    //     // psgWorker.writeReg(6, 0x10);
    //     // psgWorker.writeReg(12, 2);
    //     // psgWorker.writeReg(13, 0b1001);
    //     // psgWorker.writeReg(8, 0b1111);
    //     // psgWorker.writeReg(7, 0b111);
    //     // for (let i = 0; i < 128; ++i) {
    //     //   psgWorker.postMessage({message:'calc'});
    //     // }
    //     // for(let i = 0;i < 65536;++i){
    //     //   psgWorker.postMessage({message:'calc'});
    //     // }

    //     //psgWorker.postMessage({message:'fill'});




    //     vol = new GainNode(audioctx, { gain: 1.0 });
    //     psg.connect(vol).connect(audioctx.destination);
    //   }

    //   if (!play) {
    //     for (const i of inputs) {
    //       i.disabled = '';
    //     }
    //     play = true;
    //     // psgWorker.writeReg(8, 0b10000);
    //     // psgWorker.writeReg(9, 0b10000);
    //     // psgWorker.writeReg(10, 0b10000);
    //     // psgWorker.writeReg(12, 0xe);
    //     // psgWorker.writeReg(13, 0b1000);
    //     //wasmFuncs.writeReg(7, enable);
    //     psgWorker.postMessage({message:'play'});
    //     psg.port.postMessage({message:'play'});
    //     // psg.writeReg(6, 0b10000);
    //     vol.gain.value = 1.0;
    //     startButton.innerText = 'PSG-OFF';
    //   } else {
    //     play = false;
    //     psg.port.postMessage({message:'stop'});
    //     //psgWorker.writeReg(7, 0x3f);
    //     psgWorker.postMessage({message:'stop'});
    //     vol.gain.value = 0.0;
    //     startButton.innerText = 'PSG-ON';
    //   }
    // });


    // startButton.removeAttribute('disabled');
  });

}());
