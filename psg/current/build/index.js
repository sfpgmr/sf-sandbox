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

  // リリース時にはコメントアウトすること

  window.addEventListener('load', async () => {
    let psgBin = await (await fetch('./psg.wasm')).arrayBuffer();

    {
      let psg = (await WebAssembly.instantiateStreaming(fetch('./psg.wasm'))).instance.exports;
      psg.init(3580000, 44100);
      psg.reset();
      psg.setRate(44100);
      psg.setQuality(1);
      psg.setVolumeMode(1);
      let a = psg.setMask(0xff);
      console.log(a);
      let b = psg.toggleMask(0);
      console.log(a == b);
      psg.reset();
      console.log(psg.readIo());
      //console.log(psg.writeIO);
      //console.log(psg.writeIO);
      for (let i = 0; i < 16; ++i) {
        psg.writeReg(i, i);
        console.log(i, psg.readReg(i), i == psg.readReg(i));
      }
      //debugger;
      psg.writeReg(0, 0x5d);
      psg.writeReg(1, 0xd);
      psg.writeReg(2, 0x5d);
      psg.writeReg(3, 0x1);
      psg.writeReg(4, 0x5d);
      psg.writeReg(5, 0x2);
      psg.writeReg(6, 0x10);
      psg.writeReg(12, 2);
      psg.writeReg(13, 0b1001);
      psg.writeReg(8, 0b10000);
      psg.writeReg(7, 0b111110);
      for (let i = 0; i < 256; ++i) {
        console.log(psg.calc());
      }
    }

    let psg;
    let play = false;
    let vol;
    let enable = 0x3f;
    let envShape = 0;
    const startButton = document.getElementById('start');
    let inputs = document.querySelectorAll('input');

    for(const i of inputs){
      i.disabled = 'disabled';
    }

    ['A','B','C'].forEach((ch,i)=>{
      // Tone
      const period = document.getElementById(ch + '-Period');
      period.addEventListener('input',function(){
        document.getElementById(ch + '-Period-Text').innerText = this.value;
        psg.writeReg(i * 2,this.value & 0xff);
        psg.writeReg(i * 2 + 1,(this.value & 0xf00) >> 8);
      });

      // Noise On/OFF
      const noise = document.getElementById('Noise-' + ch);
      noise.addEventListener('click',function(){
        const m = (1 << (i+3)) ^ 0x3f; 
        let v = ((this.checked?0:1) << (i+3));
        enable = (enable & m) | v;
        console.log(m,v,(enable).toString(2));
        psg.writeReg(7,enable);
      });

      // Tone On/OFF
      const tone = document.getElementById('Tone-' + ch);
      tone.addEventListener('click',function(){
        const m = (1 << i) ^ 0x3f; 
        let v = ((this.checked?0:1) << i);
        enable = (enable & m) | v;
        console.log(m,v,(enable).toString(2));
        psg.writeReg(7,enable);
      });


      // Volume 
      const volume = document.getElementById('Volume-' + ch);
      volume.addEventListener('input',function(){
        document.getElementById('Volume-' + ch + '-Text').innerText = this.value;
        let v = document.getElementById('Env-' + ch).checked?16:0 | this.value; 
        psg.writeReg(8 + i,v);
      });

      // Envelope On/Off
      const env = document.getElementById('Env-' + ch);
      env.addEventListener('click',function(){
        let v = this.checked?16:0;
        v = v | volume.value;
        psg.writeReg(8 + i,v);
      });

    });

    // Noise Period

    const noise = document.getElementById('Noise-Period');
    noise.addEventListener('input',function(){
      document.getElementById('Noise-Period-Text').innerText = this.value;
      psg.writeReg(6,this.value);
    });

    // Enevlope Period

    const envPeriod = document.getElementById('Env-Period');
    envPeriod.addEventListener('input',function(){
      document.getElementById('Env-Period-Text').innerText = this.value;
      psg.writeReg(11,this.value & 0xff);
      psg.writeReg(12,(this.value & 0xff00) >> 8 );
    });

    // Envelope Shape

    ['Continue','Attack','Alternate','Hold'].reverse().forEach((p,i)=>{
      const param = document.getElementById(p);
      param.addEventListener('click',function(){
        let m = (1 << i) ^ 0xf;
        let v = (this.checked?1:0) << i;
        envShape = (envShape & m) | v;
        psg.writeReg(13,envShape);
      });
    });

    startButton.addEventListener('click', async () => {
      if (!psg) {
        var audioctx = new AudioContext();
        await audioctx.audioWorklet.addModule("./psg.js");
        psg = new AudioWorkletNode(audioctx, "PSG", {
          outputChannelCount: [2],
          processorOptions: {
            wasmBinary: psgBin,
            clock: 17900000
          }
        });

        psg.writeReg = (function (reg, value) {
          this.port.postMessage(
            {
              message: 'writeReg', reg: reg, value: value
            }
          );
        }).bind(psg);

        psg.port.onmessage = function (e) {
          console.log(e.data);
        };

        // psg.writeReg(8, 31);
        // psg.writeReg(0, 0x32);
        // psg.writeReg(1, 0x01);
        // psg.writeReg(2, 0x5d);
        // psg.writeReg(3, 0x02);
        // psg.writeReg(4, 0x4d);
        // psg.writeReg(5, 0x03);
        //psg.writeReg(7, enable);

        vol = new GainNode(audioctx, { gain: 1.0 });
        psg.connect(vol).connect(audioctx.destination);
        console.log(audioctx.destination.channelCount);

      }
      if (!play) {
        for(const i of inputs){
          i.disabled = '';
        }
        play = true;
        // psg.writeReg(8, 0b10000);
        // psg.writeReg(9, 0b10000);
        // psg.writeReg(10, 0b10000);
        // psg.writeReg(12, 0xe);
        // psg.writeReg(13, 0b1000);
        psg.writeReg(7, enable);
        // psg.writeReg(6, 0b10000);
        vol.gain.value = 1.0;
        startButton.innerText = 'PSG-OFF';
      } else {
        play = false;
        psg.writeReg(7, 0x3f);
        vol.gain.value = 0.0;
        startButton.innerText = 'PSG-ON';
      }
    });


    startButton.removeAttribute('disabled');
  });

}());
