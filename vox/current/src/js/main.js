'use strict';

import {Console} from './console.js';
import {Vox,loadVox} from './voxscreen.js';

// let display = true;
let play = false;

window.addEventListener('load',()=>{

  let playButton = document.getElementById('playbutton');
  playButton.addEventListener('click',function(){
      if(!play){
        playButton.setAttribute('class','hidden');
        play = true;
        start();
      }
  });
 
});

async function start(){
  try {
  const con = new Console(160,100);

  const textBitmap = new Uint8Array(
    await fetch('./font.bin')
      .then(r=>r.arrayBuffer()));
  con.initConsole(textBitmap);
  const gl = con.gl;
  const gl2 = con.gl2;

  const voxmodel = new Vox({gl2:gl2,data:await loadVox('myship.bin')});
  //const voxmodel = new Vox({gl2:gl2,data:await loadVox('./q1.bin')});

  //const myship = new SceneNode(model);
  con.vscreen.appendScene(voxmodel);

  // cube.source.translation[2] = 0;
  // //m4.scale(cube.localMatrix,[20,20,20],cube.localMatrix);
  // cube.source.scale = vec3.fromValues(50,50,50);
  // con.vscreen.appendScene(cube);

  // const cube2 = new SceneNode(model);
  // cube2.source.translation = vec3.fromValues(2,0,0);

  // cube2.source.scale = vec3.fromValues(0.5,0.5,0.5);
  
  // con.vscreen.appendScene(cube2,cube);

  
  // WebAssembly側のメモリ
  let mem ;

  // コンパイル時に引き渡すオブジェクト
  // envというプロパティにエクスポートしたいものを入れる

  const exportToWasm = {
    env:{
      consoleLogString:consoleLogString,
      consoleValue:consoleValue,
      acos:Math.acos,
      acosh:Math.acosh,
      asin:Math.asin,
      asinh:Math.asinh,
      atan:Math.atan,
      atanh:Math.atanh,
      atan2:Math.atan2,
      cbrt:Math.cbrt,
      ceil:Math.ceil,
      clz32:Math.clz32,
      cos:Math.cos,
      cosh:Math.cosh,
      exp:Math.exp,
      expm1:Math.expm1,
      floor:Math.floor,
      fround:Math.fround,
      imul:Math.imul,
      log:Math.log,
      log1p:Math.log1p,
      log10:Math.log10,
      log2:Math.log2,
      pow:Math.pow,
      round:Math.round,
      sign:Math.sign,
      sin:Math.sin,
      sinh:Math.sinh,
      sqrt:Math.sqrt,
      tan:Math.tan,
      tanh:Math.tanh
     }
  };

  function consoleValue(v){
    console.log(v);
  }
  
  function consoleLogString(index) {

    // 先頭の4byte(uint32)に文字列の長さが入っている
    const length = mem.getUint32(index,true);

    // 文字列は長さの後に続けて入っている
    const array = new Uint16Array(mem.buffer,index + 4,length);
    const str = new TextDecoder('utf-16').decode(array);
    //const str = String.fromCharCode(...array);
    alert(str);
  }
  
  // WebAssembly.instantiateStreaming(fetch("./wa/test.wasm"),exportToWasm).then(mod => {
  //   const test = mod.instance.exports.test;
  //   mem = new DataView(mod.instance.exports.memory.buffer);
  //   test();
  // });

  let time = 0;
  function main(){
      time += 0.02;
      // cube.source.rotation[1] = time;
      // cube2.source.rotation[2] = time;
      // sprite.source.rotation[0] = time/2;
      // sprite.source.translation[2] = 60.0;
      // sprite.source.rotation[1] = time/2;
      //con.text.print(0,0,'WebGL2 Point Sprite ｦﾂｶｯﾀ Spriteﾋｮｳｼﾞ TEST',true,7,1);

      con.render(time);
      // const spriteBuffer = sprite.spriteBuffer;
      // for(let i = 0;i < 512;++i){
      //   const sgn = i & 1 ? -1 : 1; 
      //   spriteBuffer.setRotate(i,sgn * time * 2);
      // }
      requestAnimationFrame(main);
  }
  main();
  } catch (e) {
  alert(e.stack);
  }
}

// function initSprite(sprite){
//   const spriteBuffer = sprite.spriteBuffer;
//   const cellSize = 24;
//   let idx = 0;
//   //let z = 320;
//   for(let z = -cellSize * 4 ,ez = cellSize * 4 ;z < ez;z += cellSize ){
//     for(let y = -cellSize * 4,ey = cellSize * 4;y < ey;y += cellSize){
//       for(let x = -cellSize * 4,ex = cellSize * 4;x < ex;x += cellSize){
//         const pos = spriteBuffer.getPosition(idx);
//         pos[0] = x;pos[1] = y;pos[2] = z;
//         const color = spriteBuffer.getColor(idx);
//         color[0] = color[1] = color[2] = color[3] = 0xff;
//         spriteBuffer.setVisible(idx,true);
//         spriteBuffer.setScale(idx,3);
//         const cellPosSize = spriteBuffer.getCellPosSize(idx);
//         cellPosSize[0] = 0 + (idx & 3) * 2;// x
//         cellPosSize[1] = 4;// y
//         cellPosSize[2] = 2;// * 8 = 32px: width
//         cellPosSize[3] = 2;// don't use
//         ++idx;
//       }
//     }
//   }
// }


