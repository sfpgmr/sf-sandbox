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
import Vue from 'vue.js';
import {Key,BasicDevice,GamePad,BasicInput} from './input.js';

// メイン
window.addEventListener('load', async ()=>{

  const basicInput = new BasicInput();

  function step(){
    requestAnimationFrame(step);
    basicInput.update();
    const qs = document.querySelector.bind(document);
    qs('#up').innerHTML = basicInput.up.pressed;
    qs('#down').innerHTML = basicInput.down.pressed;
    qs('#left').innerHTML = basicInput.left.pressed;
    qs('#right').innerHTML = basicInput.right.pressed;
    qs('#start').innerHTML = basicInput.start.pressed;
    qs('#back').innerHTML = basicInput.back.pressed;
    qs('#shoot1').innerHTML = basicInput.shoot1.pressed;
    qs('#shoot2').innerHTML = basicInput.shoot2.pressed;
    qs('#shoot3').innerHTML = basicInput.shoot3.pressed;
    qs('#shoot4').innerHTML = basicInput.shoot4.pressed;
    qs('#key-up').innerHTML = basicInput.up.name;
    qs('#key-down').innerHTML = basicInput.down.name;
    qs('#key-left').innerHTML = basicInput.left.name;
    qs('#key-right').innerHTML = basicInput.right.name;
    qs('#key-start').innerHTML = basicInput.start.name;
    qs('#key-back').innerHTML = basicInput.back.name;
    qs('#key-shoot1').innerHTML = basicInput.shoot1.name;
    qs('#key-shoot2').innerHTML = basicInput.shoot2.name;
    qs('#key-shoot3').innerHTML = basicInput.shoot3.name;
    qs('#key-shoot4').innerHTML = basicInput.shoot4.name;
  }

  requestAnimationFrame(step);



  var WIDTH = window.innerWidth , HEIGHT = window.innerHeight;

  window.addEventListener( 'resize', ()=>{
        WIDTH = window.innerWidth;
        HEIGHT = window.innerHeight;
  }
  , false );

  basicInput.bind();
  
});
