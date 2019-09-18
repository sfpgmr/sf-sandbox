(function () {
  'use strict';

  //The MIT License (MIT)
  //
  //Copyright (c) 2015 Satoshi Fujiwara
  //
  //Permission is hereby granted, free of charge, to any person obtaining a copy
  //of this software and associated documentation files (the "Software"), to deal
  //in the Software without restriction, including without limitation the rights
  //to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  //copies of the Software, and to permit persons to whom the Software is
  //furnished to do so, subject to the following conditions:
  //
  //The above copyright notice and this permission notice shall be included in
  //all copies or substantial portions of the Software.
  //
  //THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  //IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  //FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  //AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  //LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  //OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  //THE SOFTWARE.


  // エンディアンを調べる関数
  function checkEndian(buffer = new ArrayBuffer(2)) {

    if (buffer.byteLength == 1) return false;

    const ua = new Uint16Array(buffer);
    const v = new DataView(buffer);
    v.setUint16(0, 1);
    // ArrayBufferとDataViewの読み出し結果が異なればリトル・エンディアンである
    if (ua[0] != v.getUint16()) {
      ua[0] = 0;
      return true;
    }
    ua[0] = 0;
    // ビッグ・エンディアン
    return false;
  }

  const littleEndian = checkEndian();

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

  if (browser !== 'chrome') {
    alert('このページで使用する機能をサポートしていません。');
  }

  function getOffset(prop) {
    return prop._attributes_.offset;
  }

  window.addEventListener('load', async () => {

    let psg, psgBin, memoryMap, psgWorker, audioctx, wasmModule, wasmFuncs;
    let play = false;
    let vol;
    const startButton = document.getElementById('start');
    let inputs = document.querySelectorAll('input');

    // 
    for (const i of inputs) {
      i.disabled = 'disabled';
    }

    inputs = document.querySelectorAll('textarea');

    // for (const i of inputs) {
    //   i.disabled = 'disabled';
    // }


    window.addEventListener("unload", () => {
      if (psgWorker) {
        psgWorker.terminate();
      }
      if (audioctx) {
        audioctx.close();
      }
    });

    // Wave Table エディタ
    let waveTableSize = 32;
    const canvasWitdh = 512,canvasHeight = 256;
    let pixelWidth = (512 / waveTableSize) | 0;
    let isDrawing = false, drawPosition = {x:0,y:0};

    const waveTableLength = document.getElementById('wavetable-length');
    waveTableLength.addEventListener('change',(e)=>{
      waveTableSize = e.target.value;
      pixelWidth = (canvasWitdh / waveTableSize) | 0;
    });

    const waveTableCanvas = document.getElementById("WPSG-Wave-Table"),
      context = waveTableCanvas.getContext("2d");


    function calcPos(e){
      const rect = waveTableCanvas.getBoundingClientRect();
      drawPosition.x = (((e.clientX - rect.left) / pixelWidth )  | 0) * pixelWidth;
      drawPosition.y = (e.clientY - rect.top) | 0;
    }

    waveTableCanvas.addEventListener('mousedown', e => {
      calcPos(e);
      isDrawing = true;
    });

    waveTableCanvas.addEventListener('mousemove', e => {
      if (isDrawing === true) {
        let sx = drawPosition.x;
        let sy = drawPosition.y;
        let halfHeight = canvasHeight / 2;
        calcPos(e);
        // x
        let ex = drawPosition.x;
        let w = (Math.abs(ex - sx) + pixelWidth) | 0;
        if(ex < sx){
          sx = ex;
        }

        // y
        let wy;
        if(sy < halfHeight){
          wy =  halfHeight - sy;
        } else {
          wy = sy - halfHeight;
          sy = halfHeight;
        }
        
        context.fillStyle = 'black';
        context.fillRect(sx, 0, w, 256);

        context.fillStyle = 'red';
        context.fillRect(sx, sy, w, wy);
      }
    });

    waveTableCanvas.addEventListener('mouseup', e => {
      if (isDrawing === true) {
        isDrawing = false;
      }
    });

    waveTableCanvas
    .addEventListener("click", (e) => {
        context.fillStyle = 'red';
        const rect = waveTableCanvas.getBoundingClientRect();
        context.fillRect(e.clientX - rect.left, e.clientY - rect.top, 1, 1);
        e.preventDefault = true;
      }, false);

    const formulaInfo = document.getElementById('result-fomula');
    formulaInfo.style.display = 'none';
    
    function showFormulaInfo (display,message){
      if(display){
        formulaInfo.style.display = '';
        formulaInfo.innerText = message;
      } else {
        formulaInfo.style.display = 'none';
      }
    }

    const formula = document.getElementById('formula');
    const applyFormula = document.getElementById('apply-formula');
    applyFormula.addEventListener('click',function(e){
      showFormulaInfo(false);
      // 簡易チェック
      if(formula.value.match(/(alert)|(console)/))
      {
        showFormulaInfo(true,'error:console,alertは使用できません。');
        e.preventDefault = true;
        return false;
      }
      drawFormula(formula.value);
    });

    function drawFormula(code){
      let f = new Function('t','return (' + code + ');');
      for(let x = 0,ex = waveTableSize; x < ex;++x){
        let t = x / ex * Math.PI * 2;
        let y = f(t) ;
        if(y > 1.0) y = 1.0;
        if(y < -1.0) y = -1.0;

        let halfHeight = canvasHeight / 2;
        y = halfHeight - (y * halfHeight);
        let wy;
        if(y < halfHeight){
          wy =  halfHeight - y;
        } else {
          wy = y - halfHeight;
          y = halfHeight;
        }

        context.fillStyle = 'black';
        context.fillRect(x * pixelWidth, 0, pixelWidth, 256);

        context.fillStyle = 'red';
        context.fillRect(x * pixelWidth, y, pixelWidth, wy);

      }
    }

      




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

    startButton.addEventListener('click', async () => {

      if (!psg) {
        // Shared Memoryの利用
        // wasmバイナリの読み込み
        psgBin = await (await fetch('./wpsg.wasm')).arrayBuffer();

        memoryMap = await fetch('./wpsg.context.json');
        memoryMap = await memoryMap.json();

        audioctx = new AudioContext();
        // 100ms分のバッファサイズを求める
        let audioBufferSize = Math.pow(2, Math.ceil(Math.log2(audioctx.sampleRate * 4 * 0.1)));

        const memory = new WebAssembly.Memory({ initial: 20, shared: true, maximum: 20 });

        wasmModule = await WebAssembly.compile(psgBin);
        wasmFuncs = (await WebAssembly.instantiate(wasmModule, { env: { memory: memory }, imports: { sin: Math.sin, cos: Math.cos, exp: Math.exp, sinh: Math.sinh, pow: Math.pow } })).exports;

        wasmFuncs.setRate(audioctx.sampleRate);
        wasmFuncs.initMemory();
        wasmFuncs.initOutputBuffer(audioBufferSize);
        // Atomics.store(ia,getOffset(memoryMap.buffer_size) >> 2,audioBufferSize);

        await audioctx.audioWorklet.addModule("./wpsg.js");
        psg = new AudioWorkletNode(audioctx, "PSG", {
          outputChannelCount: [2]
        });

        psgWorker = new Worker('./wpsg-worker.js');
        psgWorker.onmessage = function (e) {
          console.log(e.data);
        };

        psgWorker.onerror = function (e) {
          console.log(e);
        };

        psg.port.postMessage({
          message: 'init',
          memory: memory,
          bufferStart: getOffset(memoryMap.output_buffer_offset),
          readOffset: getOffset(memoryMap.read_offset),
          writeOffset: getOffset(memoryMap.write_offset),
          bufferSize: getOffset(memoryMap.output_buffer_size),
          sampleRate: audioctx.sampleRate,
          endian: littleEndian
        });

        psgWorker.postMessage({
          message: 'init',
          wasmBinary: psgBin,
          memory: memory,
          sampleRate: audioctx.sampleRate,
          endian: littleEndian
        });

        vol = new GainNode(audioctx, { gain: 1.0 });
        psg.connect(vol).connect(audioctx.destination);
      }

      if (!play) {
        // for (const i of inputs) {
        //   i.disabled = '';
        // }
        play = true;
        // psgWorker.writeReg(8, 0b10000);
        // psgWorker.writeReg(9, 0b10000);
        // psgWorker.writeReg(10, 0b10000);
        // psgWorker.writeReg(12, 0xe);
        // psgWorker.writeReg(13, 0b1000);
        //wasmFuncs.writeReg(7, enable);
        psgWorker.postMessage({ message: 'play' });
        psg.port.postMessage({ message: 'play' });
        // psg.writeReg(6, 0b10000);
        vol.gain.value = 1.0;
        startButton.innerText = 'PSG-OFF';
      } else {
        play = false;
        psg.port.postMessage({ message: 'stop' });
        //psgWorker.writeReg(7, 0x3f);
        psgWorker.postMessage({ message: 'stop' });
        vol.gain.value = 0.0;
        startButton.innerText = 'PSG-ON';
      }
    });


    startButton.removeAttribute('disabled');
  });

}());
