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

//import denodeify from '../denodeify'; 
import TWEEN from 'tween.js';
import TimeLine  from './timeline.mjs';
//import sharp  from 'sharp';
import QueryString  from './QueryString.mjs';
//import SF8Pass from './SF8Pass.mjs';
//import SFShaderPass from './SFShaderPass.mjs';
import HorseAnim from './HorseAnim.mjs';

//import SFCapturePass from '../SFCapturePass';
import SFRydeen from './SFRydeen.mjs';
//import SFGpGpuPass from '../SFGpGpuPass';
//import GlitchPass from '../GlitchPass';
//import { hostname } from 'os';
//import AudioAnalyser from '../AudioAnalyser.mjs';


const SAMPLE_RATE = 96000;

// from gist
// https://gist.github.com/gabrielflorit/3758456
function createShape(geometry, color, x, y, z, rx, ry, rz, s) {
  // flat shape

  // var geometry = new THREE.ShapeGeometry( shape );
  var material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    overdraw: true
  });

  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.set(s, s, s);

  return mesh;
}

var time,chR,chL;

// メイン
window.addEventListener('load', async ()=>{
  var qstr = new QueryString();
  var params = qstr.parse(window.location.search.substr(1));
  var preview = params.preview == 'true';
  const fps = 60;//parseFloat(params.framerate);
  var WIDTH = window.innerWidth , HEIGHT = window.innerHeight;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');
  var renderer = new THREE.WebGLRenderer({ antialias: false, sortObjects: true });
  //var renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context,antialias: false, sortObjects: true,autoClear:false});
  

  //var renderer = new THREE.WebGLRenderer({ antialias: false, sortObjects: true });
  //const audioAnalyser = new AudioAnalyser();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.setClearColor(0x000000, 1);
  renderer.domElement.id = 'console';
  renderer.domElement.className = 'console';
  renderer.domElement.style.zIndex = 0;

  d3.select('#content').node().appendChild(renderer.domElement);
  renderer.clear();


  //レンダリング
  var r = 0.0;
  var step = 48000 / fps;
  var frameDelta = 30 / fps;
  var waveCount = 0;
  var index = 0;
  time = 0//20.140 * 1000 - 1500;//60420;//(60420 - 1500) /1000 ;//0.0;
  var frameNo = 0;
  var endTime = 60.0 * 4.0 + 30.0;
  var frameSpeed = 1.0 / fps; 
  var delta = frameSpeed;
  var previewCount = 0;
  var chR;
  var chL;
  var timer = 0;
  var pchain = Promise.resolve(0);
  var writeFilePromises = []; 

  // Post Effect

  let composer = new THREE.EffectComposer(renderer);
  composer.setSize(WIDTH, HEIGHT);

  //let renderPass = new THREE.RenderPass(scene, camera);
  var animMain = new SFRydeen(WIDTH,HEIGHT,fps,endTime,SAMPLE_RATE);
  await animMain.init;
  //var animMain = new SFGpGpuPass(WIDTH,HEIGHT,renderer);
  animMain.renderToScreen = false;
  animMain.enabled = true;

  // var horseAnim = new HorseAnim(WIDTH,HEIGHT);
  // await horseAnim.resLoading;
  // horseAnim.renderToScreen = true;
  // horseAnim.enabled = true;
  // composer.addPass(horseAnim);

  composer.addPass(animMain);

  // let gpuPass = new SFGpGpuPass(WIDTH,HEIGHT,renderer);
  // gpuPass.renderToScreen = false;
  // gpuPass.enabled = true;
  // composer.addPass(gpuPass);

  // let sfShaderPass = new SFShaderPass(WIDTH,HEIGHT);
  // sfShaderPass.enabled = true;
  // sfShaderPass.renderToScreen = true;
  // composer.addPass(sfShaderPass);


  
//   let glitchPass = new GlitchPass();
//   glitchPass.renderToScreen = false;
//   glitchPass.enabled = true;
//   glitchPass.goWild = false;
//   composer.addPass( glitchPass );

//   let dotScreen = new THREE.ShaderPass(THREE.DotScreenShader);
//   dotScreen.uniforms['scale'].value = 4;
//   dotScreen.enabled = false;
//   dotScreen.renderToScreen = false;

//   composer.addPass(dotScreen);

//   let sf8Pass = new SF8Pass();
// //  rgbShift.uniforms['amount'].value = 0.0035;
//   sf8Pass.enabled = true;
//   sf8Pass.renderToScreen = true;
//   composer.addPass(sf8Pass);

  // let rgbShift = new THREE.SF8Pass(THREE.RGBShiftShader);
  // rgbShift.uniforms['amount'].value = 0.0035;
  // rgbShift.enabled = false;
  // rgbShift.renderToScreen = false;
  // composer.addPass(rgbShift);

  // let sfCapturePass;
  // if(!preview){
  //   sfCapturePass = new SFCapturePass(WIDTH,HEIGHT);
  //   sfCapturePass.enabled = true;
  //   sfCapturePass.renderToScreen = true;
  //   composer.addPass(sfCapturePass);
  // }

  //renderPass.renderToScreen = true;

  function start(tween){
    let t = tween();
    return t.start.bind(t);
  }

  function fillEffect(){
    return  new TWEEN.default.Tween({})
      .to({},40)
      .onStart(()=>{
        glitchPass.goWild = true;
      })
      .onComplete(()=>{
        glitchPass.goWild = false;
      });
  }

  // 間奏
  function intEffect(){
    return  new TWEEN.default.Tween({})
      .to({},25.175 * 1000)
      .onUpdate(()=>{
        dotScreen.uniforms['scale'].value = (chR[waveCount] + chL[waveCount]) * 8 + 1;
      })
      .onStart(()=>{
        dotScreen.enabled = true;
      })
      .onComplete(()=>{
        dotScreen.enabled = false;
      });
  }

  function intEffect2(){
    return  new TWEEN.default.Tween({})
      .to({},80)
      .onUpdate(()=>{
      })
      .onStart(()=>{
        dotScreen.enabled = false;
      })
      .onComplete(()=>{
        dotScreen.enabled = true;
      });
  }

  // テクスチャのアップデート
  var events = [
    // 馬のフェードイン・フェードアウト
    {time:21.140 * 1000 - 1500,func:animMain.horseFadein()},
    {time:22.727 * 1000 - 1500,func:animMain.horseFadeout()},
    {time:60420 - 1500,func:animMain.horseFadein()},
    {time:60240 + 20140 - 3000 - 1500,func:animMain.horseFadeout()},
    {time:134266 - 1500,func:animMain.horseFadein()},
    {time:134266 + 20140 - 3000 - 1500,func:animMain.horseFadeout()},
    // シリンダーの回転
    {time:0,func:start(animMain.rotateCilynder.bind(animMain))},
    // カメラワーク
    {time:20.140 * 1000 - 1500,func:start(animMain.cameraTween.bind(animMain))},
    {time:32.727 * 1000 - 1500,func:start(animMain.cameraTween2.bind(animMain))},
    {time:46.993 * 1000 - 1500,func:start(animMain.cameraTween.bind(animMain))},
    {time:60.420 * 1000 - 1500,func:start(animMain.cameraTween4.bind(animMain))},
    {time:79.720 * 1000 - 1500,func:start(animMain.cameraTween2.bind(animMain))},
    {time:93.986 * 1000 - 1500,func:start(animMain.cameraTween.bind(animMain))},
    {time:106.573 * 1000 - 1500,func:start(animMain.cameraTween2.bind(animMain))},
    {time:120.839 * 1000 - 1500,func:start(animMain.cameraTween.bind(animMain))},
    {time:133.427 * 1000 - 1500,func:start(animMain.cameraTween4.bind(animMain))},
    {time:180.420 * 1000 - 1500,func:start(animMain.cameraTween2.bind(animMain))},
    // //drums fill
    // {time:5.874 * 1000 - 1500,func:start(fillEffect)},
    // {time:6.294 * 1000 - 1500,func:start(fillEffect)},

    // {time:19.510 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:19.510 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:19.510 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:19.510 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:19.510 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},

    // {time:32.727 * 1000 - 1500,func:start(fillEffect)},
    // {time:32.727 * 1000 - 1500 + 420,func:start(fillEffect)},

    // {time:46.364 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:46.364 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:46.364 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:46.364 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:46.364 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},

    // {time:49.719 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:49.719 * 1000 - 1500 + 105,func:start(fillEffect)},
    
    // {time:50.137 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:50.137 * 1000 - 1500 + 105,func:start(fillEffect)},

    // {time:59.794 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:59.794 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:59.794 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:59.794 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:59.794 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},
    // {time:59.794 * 1000 - 1500 + 105 * 5,func:start(fillEffect)},

    // {time:79.722 * 1000 - 1500,func:start(fillEffect)},
    // {time:79.722 * 1000 - 1500 + 420,func:start(fillEffect)},

    // {time:92.308 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:92.308 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:92.727 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:92.727 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:93.255 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:93.255 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:93.255 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:93.255 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:93.255 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},
    // {time:93.255 * 1000 - 1500 + 105 * 5,func:start(fillEffect)},

    // {time:100.066 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:100.066 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:100.066 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:100.066 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:100.066 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},

    // {time:106.575 * 1000 - 1500,func:start(fillEffect)},
    // {time:106.575 * 1000 - 1500 + 420,func:start(fillEffect)},

    // {time:120.000 * 1000 - 1500,func:start(fillEffect)},
    // {time:120.000 * 1000 - 1500 + 210,func:start(fillEffect)},
    // {time:120.000 * 1000 - 1500 + 420,func:start(fillEffect)},
    // {time:120.000 * 1000 - 1500 + 630,func:start(fillEffect)},

    // {time:132.800 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:132.800 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:132.800 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:132.800 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:132.800 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},

    // {time:133.428 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:133.428 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:133.428 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:133.428 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:133.428 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},
    // {time:133.428 * 1000 - 1500 + 105 * 5,func:start(fillEffect)},
    // {time:133.428 * 1000 - 1500 + 105 * 6,func:start(fillEffect)},
    
    // {time:153.570 * 1000 - 1500,func:start(fillEffect)},
    // {time:153.570 * 1000 - 1500 + 420,func:start(fillEffect)},

    // {time:179.582 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:179.582 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:179.582 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},

    // {time:180.002 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:180.002 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:180.002 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},

    // {time:180.410 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:180.410 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:180.410 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:180.410 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:180.410 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},
    // {time:180.410 * 1000 - 1500 + 105 * 5,func:start(fillEffect)},
    // {time:180.410 * 1000 - 1500 + 105 * 6,func:start(fillEffect)},

    // {time:187.134 * 1000 - 1500,func:start(fillEffect)},
    // {time:187.134 * 1000 - 1500 + 420,func:start(fillEffect)},

    // {time:193.222 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:193.222 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:193.222 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:193.222 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:193.222 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},

    // {time:193.841 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:193.841 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:193.841 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:193.841 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:193.841 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},
    // {time:193.841 * 1000 - 1500 + 105 * 5,func:start(fillEffect)},
    // {time:193.841 * 1000 - 1500 + 105 * 6,func:start(fillEffect)},

    // {time:200.730 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:200.730 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:200.730 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:200.730 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:200.730 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},
    
    // {time:207.276 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:207.276 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:207.276 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},

    // {time:207.687 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:207.687 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:207.687 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},

    // {time:214.199 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:214.199 * 1000 - 1500 + 105,func:start(fillEffect)},

    // {time:214.612 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:214.612 * 1000 - 1500 + 105,func:start(fillEffect)},

    // {time:220.068 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:220.068 * 1000 - 1500 + 210,func:start(fillEffect)},
    // {time:220.068 * 1000 - 1500 + 210 * 2,func:start(fillEffect)},
    // {time:220.068 * 1000 - 1500 + 210 * 3,func:start(fillEffect)},
    // {time:220.068 * 1000 - 1500 + 210 * 4,func:start(fillEffect)},
    // {time:220.068 * 1000 - 1500 + 210 * 5,func:start(fillEffect)},
    // {time:220.068 * 1000 - 1500 + 210 * 6,func:start(fillEffect)},

    // {time:227.626 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:227.626 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:227.626 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:227.626 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:227.626 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},

    // {time:233.492 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:233.492 * 1000 - 1500 + 105,func:start(fillEffect)},

    // {time:233.916 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:233.916 * 1000 - 1500 + 105,func:start(fillEffect)},

    // {time:234.234 * 1000 - 1500 ,func:start(fillEffect)},
    // {time:234.234 * 1000 - 1500 + 105,func:start(fillEffect)},
    // {time:234.234 * 1000 - 1500 + 105 * 2,func:start(fillEffect)},
    // {time:234.234 * 1000 - 1500 + 105 * 3,func:start(fillEffect)},
    // {time:234.234 * 1000 - 1500 + 105 * 4,func:start(fillEffect)},
    // {time:234.234 * 1000 - 1500 + 105 * 5,func:start(fillEffect)},

    // //間奏エフェクト
    // {time:154.406 * 1000 - 1500,func:start(intEffect)},
    // {time:0,func:start(intEffect)}

  ];
  
  // // 間奏エフェクト
  // {
  //   let s = 161.119 * 1000 - 1500;
  //   for(let i = 0;i < 11;++i){
  //     let st = s + i * 420 * 4;
  //     events = events.concat([
  //       {time:st,func:start(intEffect2)},
  //       {time:st + 210,func:start(intEffect2)},
  //       {time:st + 420,func:start(intEffect2)},
  //       {time:st + 735,func:start(intEffect2)},
  //       {time:st + 945,func:start(intEffect2)},
  //       {time:st + 1155,func:start(intEffect2)},
  //       {time:st + 1260,func:start(intEffect2)},
  //       {time:st + 1470,func:start(intEffect2)},
  //     ]);
  //   }
  // }


  var timeline = new TimeLine(events); 

  if(time != 0){
    timeline.skip(time);
  }

  window.addEventListener( 'resize', ()=>{
        WIDTH = window.innerWidth;
        HEIGHT = window.innerHeight;
//        windowHalfX = window.innerWidth / 2;
//				windowHalfY = window.innerHeight / 2;
//				camera.aspect = window.innerWidth / window.innerHeight;
//				camera.updateProjectionMatrix();
				renderer.setSize(WIDTH,HEIGHT);
        composer.setSize(WIDTH,HEIGHT)
  }
  , false );
  
  function render(preview) {
    // if (preview) {
    //   // プレビュー
    //   // previewCount++;
    //   // if ((previewCount & 1) == 0) {
    //   //   requestAnimationFrame(render.bind(render, true));
    //   //   return;
    //   // }
    // }

    time += frameSpeed;
    if (time > endTime) {
      return;
    }
    ++frameNo;

    waveCount += step;
    if(waveCount >= chR.length){
      return;
    }

    animMain.update(time);
    //horseAnim.update();
    //renderer.clear();
    //gpuPass.update(time);
    composer.render();

    // if(sfShaderPass.enabled && ((frameNo & 3) == 0)){
    //   sfShaderPass.uniforms.time.value += 0.105 * 4 * frameDelta;
    // }
    let timeMs = time * 1000;
    timeline.update(timeMs);
    TWEEN.update(timeMs);
    // プレビュー
    requestAnimationFrame(render.bind(null, preview));
  }
  

  // ファイルのロード
  await new Promise((resolve,reject)=>{
    let loader = new THREE.AudioLoader();
    loader.load('../../media/rydeen.wav',(buffer)=>{
      chL = animMain.chL = buffer.getChannelData(0);
      chR = animMain.chR = buffer.getChannelData(1);
      //const audioListener = new THREE.AudioListener();
      //let a = new THREE.Audio(audioListener);
      //a.setBuffer(buffer);
      //a.play();
      resolve();
    });
  });

  render(preview);

});


