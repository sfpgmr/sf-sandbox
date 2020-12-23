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
  let play = false;
  const startButton = document.getElementById('start');
  let inputs = document.querySelectorAll('input');
   let audio,seq;
  startButton.addEventListener('click', async () => {
    try {
    if(!audio){
      audio = new Audio.Audio();
      seq = new Audio.Sequencer(audio);
      seq.load(seqData);
    }

    if (!play) {
      for(const i of inputs){
        i.disabled = '';
      }
      seq.start();
      play = true;
      startButton.innerText = '停止';
    } else {
      seq.stop();
      play = false;
      startButton.innerText = '再生';
    }
    } catch (e) {
      alert(e.stack);
    }

  });


  startButton.removeAttribute('disabled');
});
