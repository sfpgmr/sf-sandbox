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
//document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] +
//':35729/livereload.js?snipver=2"></' + 'script>');
"use strict";

import createBgPass from './BgPass.mjs';

// メイン
window.addEventListener('load', async ()=>{

  var WIDTH = window.innerWidth , HEIGHT = window.innerHeight;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context,antialias: true, sortObjects: true,autoClear:false});
  //var renderer = new THREE.WebGLRenderer({ antialias: false, sortObjects: true,autoClear:false});

  renderer.setSize(WIDTH, HEIGHT);
  renderer.setClearColor(0x000000, 1);
  renderer.domElement.id = 'console';
  renderer.domElement.className = 'console';
  renderer.domElement.style.zIndex = 0;

  d3.select('#content').node().appendChild(renderer.domElement);
  renderer.clear();


  // Post Effect
  let composer = new THREE.EffectComposer(renderer);

  var bgPass = await createBgPass(WIDTH,HEIGHT);
  bgPass.renderToScreen = true;
  bgPass.enabled = true;

  composer.addPass(bgPass);
  composer.setSize(WIDTH, HEIGHT);

  window.addEventListener( 'resize', ()=>{
        WIDTH = window.innerWidth;
        HEIGHT = window.innerHeight;
				renderer.setSize(WIDTH,HEIGHT);
        composer.setSize(WIDTH,HEIGHT)
  }
  , false );
  
  function render() {
    bgPass.update();
    composer.render();
    requestAnimationFrame(render);
  }

  render();

});
