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

"use strict";
import * as Audio from './audio.js';
import {seqData} from './seqData.js';

window.addEventListener('load', async () => {
  // let psgBin = await (await fetch('./wpsg.wasm')).arrayBuffer();
  
  
  // let psg;
  let play = false;
  // let vol;
  // let enable = 0x3f;
  // let envShape = 0;
  const startButton = document.getElementById('start');
  let inputs = document.querySelectorAll('input');
  // let currentChannel = 0;

  // for(const i of inputs){
  //   i.disabled = 'disabled';
  // }

  // const chTabs = document.querySelectorAll('#WPSG-Ch-Tabs > div');
  // chTabs.forEach((elm,k,p)=>{
  //   elm.addEventListener('click',function(){
  //     if(currentChannel != parseInt(this.dataset.ch)){
  //       document.querySelector('#WPSG-Ch-Tabs > div[data-ch="' + currentChannel + '"]').classList.remove('siimple-tabs-item--selected');
  //       currentChannel = parseInt(this.dataset.ch);
  //       elm.classList.add('siimple-tabs-item--selected');
  //     }
  //   });
  // });

  // const WPSGEnableCheckBox = document.getElementById('WPSG-Enable');
  // const WPSGFreqSlider = document.getElementById('WPSG-Freq');
  // const WPSGFreqText = document.getElementById('WPSG-Freq');
  // const WPSGVolumeSlider = document.getElementById('WPSG-Volume');
  // const WPSGVolumeText = document.getElementById('WPSG-Volume');

  
  // ['A','B','C'].forEach((ch,i)=>{
  //   // Tone
  //   const period = document.getElementById(ch + '-Period');
  //   period.addEventListener('input',function(){
  //     document.getElementById(ch + '-Period-Text').innerText = this.value;
  //     psg.writeReg(i * 2,this.value & 0xff);
  //     psg.writeReg(i * 2 + 1,(this.value & 0xf00) >> 8);
  //   });

  //   // Noise On/OFF
  //   const noise = document.getElementById('Noise-' + ch);
  //   noise.addEventListener('click',function(){
  //     const m = (1 << (i+3)) ^ 0x3f; 
  //     let v = ((this.checked?0:1) << (i+3));
  //     enable = (enable & m) | v;
  //     console.log(m,v,(enable).toString(2));
  //     psg.writeReg(7,enable);
  //   });

  //   // Tone On/OFF
  //   const tone = document.getElementById('Tone-' + ch);
  //   tone.addEventListener('click',function(){
  //     const m = (1 << i) ^ 0x3f; 
  //     let v = ((this.checked?0:1) << i);
  //     enable = (enable & m) | v;
  //     console.log(m,v,(enable).toString(2));
  //     psg.writeReg(7,enable);
  //   });


  //   // Volume 
  //   const volume = document.getElementById('Volume-' + ch);
  //   volume.addEventListener('input',function(){
  //     document.getElementById('Volume-' + ch + '-Text').innerText = this.value;
  //     let v = document.getElementById('Env-' + ch).checked?16:0 | this.value; 
  //     psg.writeReg(8 + i,v);
  //   });

  //   // Envelope On/Off
  //   const env = document.getElementById('Env-' + ch);
  //   env.addEventListener('click',function(){
  //     let v = this.checked?16:0;
  //     v = v | volume.value;
  //     psg.writeReg(8 + i,v);
  //   });

  // });

  // // Noise Period

  // const noise = document.getElementById('Noise-Period');
  // noise.addEventListener('input',function(){
  //   document.getElementById('Noise-Period-Text').innerText = this.value;
  //   psg.writeReg(6,this.value);
  // });

  // // Enevlope Period

  // const envPeriod = document.getElementById('Env-Period');
  // envPeriod.addEventListener('input',function(){
  //   document.getElementById('Env-Period-Text').innerText = this.value;
  //   psg.writeReg(11,this.value & 0xff);
  //   psg.writeReg(12,(this.value & 0xff00) >> 8 );
  // });

  // // Envelope Shape

  // ['Continue','Attack','Alternate','Hold'].reverse().forEach((p,i)=>{
  //   const param = document.getElementById(p);
  //   param.addEventListener('click',function(){
  //     let m = (1 << i) ^ 0xf;
  //     let v = (this.checked?1:0) << i;
  //     envShape = (envShape & m) | v;
  //     psg.writeReg(13,envShape);
  //   });
  // });

  startButton.addEventListener('click', async () => {
    try {
    const audio = new Audio.Audio();
    //await audio.readDrumSamples;
    const seq = new Audio.Sequencer(audio);
    seq.load(seqData);
    seq.start();



    // if (!psg) {
    //   var audioctx = new AudioContext();
    //   await audioctx.audioWorklet.addModule("./psg.js");
    //   psg = new AudioWorkletNode(audioctx, "PSG", {
    //     outputChannelCount: [2],
    //     processorOptions: {
    //       wasmBinary: psgBin,
    //       sampleRate: 17900000
    //     }
    //   });

    //   psg.writeReg = (function (reg, value) {
    //     this.port.postMessage(
    //       {
    //         message: 'writeReg', reg: reg, value: value
    //       }
    //     )
    //   }).bind(psg);

    //   psg.port.onmessage = function (e) {
    //     console.log(e.data);
    //   };

    //   // psg.writeReg(8, 31);
    //   // psg.writeReg(0, 0x32);
    //   // psg.writeReg(1, 0x01);
    //   // psg.writeReg(2, 0x5d);
    //   // psg.writeReg(3, 0x02);
    //   // psg.writeReg(4, 0x4d);
    //   // psg.writeReg(5, 0x03);
    //   //psg.writeReg(7, enable);

    //   vol = new GainNode(audioctx, { gain: 1.0 });
    //   psg.connect(vol).connect(audioctx.destination);
    //   console.log(audioctx.destination.channelCount);

    // }
    if (!play) {
      for(const i of inputs){
        i.disabled = '';
      }
      play = true;
      startButton.innerText = 'WPSG-OFF';
    } else {
      play = false;
      startButton.innerText = 'WPSG-ON';

    }
    } catch (e) {
      alert(e.stack);
    }

  });


  startButton.removeAttribute('disabled');
});
