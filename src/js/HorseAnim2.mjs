/**
 * @author SFPGMR
 */
// Shader Sampleより拝借
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_shader.html
"use strict";
import * as TWEEN from 'tween.js';

export default class SFRydeenPass extends THREE.Pass {
  constructor(width, height, fps, endTime, sampleRate = 48000) {
    super();
    this.time = 0;
    this.needSwap = false;
    this.clear = true;
    var scene = new THREE.Scene();
    this.scene = scene;
    this.sampleRate = sampleRate;
    this.chR = null;
    this.chL = null;
    this.fps = fps;
    this.endTime = endTime;
    this.step = sampleRate / fps;
    this.frameDelta = 30 / fps;
    this.fftsize = 256;
    this.fft = new FFT(this.fftsize, sampleRate);
    this.frameSpeed = 1.0 / fps;
    this.delta = this.frameSpeed;
    this.radius = 1000, this.theta = 0;
    this.fftmeshSpeed = 50 * this.frameDelta;
    //scene.fog = new THREE.Fog( 0x000000, -1000, 8000 );

    // カメラの作成
    // var camera = new THREE.PerspectiveCamera(90.0, WIDTH / HEIGHT);
    // camera.position.x = 0.0;
    // camera.position.y = 0.0;
    // camera.position.z = (WIDTH / 2.0) * HEIGHT / WIDTH;
    // camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));
    var camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
    camera.position.z = 500;
    camera.position.x = 0;
    camera.position.y = 1000;
    camera.target = new THREE.Vector3(0, 0, 0);
    this.camera = camera;

    var light1 = new THREE.DirectionalLight(0xefefff, 1.5);
    light1.position.set(1, 1, 1).normalize();
    scene.add(light1);
    this.light1 = light1;

    var light2 = new THREE.DirectionalLight(0xffefef, 1.5);
    light2.position.set(-1, -1, -1).normalize();
    scene.add(light2);
    this.light2 = light2;

    var horseAnimSpeed = (60.0 / (143.0));
    var meshes = [];
    this.meshes = meshes;
    var mixers = [];
    this.mixers = mixers;

    var HORSE_NUM = 40;


    // FFT表示用テクスチャ
    var TEXW = 1024;
    this.TEXW = TEXW;
    var TEXH = 1024;
    this.TEXH = TEXH;
    var canvas = document.createElement('canvas');
    canvas.width = TEXW;
    canvas.height = TEXH;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgba(255,255,255,1.0)";
    ctx.fillRect(0, 0, TEXW, TEXH);
    this.ctx = ctx;
    var ffttexture = new THREE.Texture(canvas);
    this.ffttexture = ffttexture;

    var ffttexture2 = new THREE.Texture(canvas);
    this.ffttexture2 = ffttexture2;

    ffttexture.needsUpdate = true;
    ffttexture2.needsUpdate = true;

    var fftgeometry = new THREE.PlaneBufferGeometry(8192, 8192, 32, 32);
    this.fftgeometry = fftgeometry;

    var fftmaterial = new THREE.MeshBasicMaterial({ map: ffttexture2, transparent: true, overdraw: true, opacity: 1.0, side: THREE.DoubleSide });
    this.fftmaterial = this.fftmaterial;

    var fftmesh = new THREE.Mesh(fftgeometry, fftmaterial);
    this.fftmesh = fftmesh;

    ffttexture2.wrapS = THREE.RepeatWrapping;
    ffttexture2.wrapT = THREE.RepeatWrapping;
    ffttexture2.repeat.set(6, 1);

    ffttexture.wrapS = THREE.RepeatWrapping;
    ffttexture.wrapT = THREE.RepeatWrapping;
    ffttexture.repeat.set(1, 1);

    fftmesh.position.z = 0.0;
    fftmesh.rotation.x = Math.PI / 2;

    var fftmesh2 = fftmesh.clone();
    this.fftmesh2 = fftmesh2;
    fftmesh2.position.x += 8192;

    scene.add(fftmesh);
    scene.add(fftmesh2);

    var wgeometry = new THREE.CylinderGeometry(512, 512, 32768, 32, 32, true);
    wgeometry.rotateY(Math.PI / 2);
    this.wgeometry = wgeometry;

    var wmesh = new THREE.Mesh(wgeometry, new THREE.MeshBasicMaterial({ map: ffttexture, transparent: true, side: THREE.DoubleSide }));
    wmesh.position.x = 0;
    wmesh.position.y = 0;
    wmesh.rotation.y = Math.PI / 2;
    wmesh.rotation.z = Math.PI / 2;
    wmesh.position.z = 0;
    this.wmesh = wmesh;

    scene.add(wmesh);
    camera.position.z = 1000;
    camera.position.x = 0;
    camera.position.y = 0;

    var horseMaterial;
    this.horseMaterial = horseMaterial;
    var horseGroup = new THREE.Group();
    this.horseGroup = horseGroup;

    // 馬メッシュのロード

    this.init = (() => {
      return new Promise((resolve, reject) => {
        const loader = new THREE.GLTFLoader();
        loader.load( "./horse.glb", function( gltf ) {
          meshes[0] = gltf.scene.children[ 0 ];
          meshes[0].scale.set( 1.5, 1.5, 1.5 );
          meshes[0].rotation.y = 0.5 * Math.PI;
          meshes[0].position.y = 0;
          meshes[0].material.transparent = true;

          for (let i = 1; i < HORSE_NUM; ++i) {
            meshes[i] = meshes[0].clone();

  //           meshes[i].material =  new THREE.MeshPhongMaterial( {
  //         // vertexColors: THREE.FaceColors,
  //           // shading: THREE.SmoothShading,
  //           //transparent:true,
  //           //map:ffttexture,
  //         // side:THREE.DoubleSide,
  // //            morphNormals: true,
  //             //color: 0xffffff,
  //             morphTargets: true,
  //             transparent: true,
  //             opacity:0.5,
  //             color:new THREE.Color(1.0,0.5,0.0)

  //             //morphNormals: true,
  //             //shading: THREE.SmoothShading//,
  //             //morphTargets: true
  //           } );;
            meshes[i].position.x = (Math.floor((Math.random() - 0.5) * 10)) * 450;
            meshes[i].position.z = (Math.floor((Math.random() - 0.5) * 10)) * 150;
            meshes[i].position.y = 0/*(Math.random() - 0.6) * 1000*/;
          }

          for (let i = 0; i < HORSE_NUM; ++i) {
            horseGroup.add(meshes[i]);
            //scene.add( meshes[i] );
            mixers[i] = new THREE.AnimationMixer(meshes[i]);
            //let clip = THREE.AnimationClip.CreateFromMorphTargetSequence('gallop', geometry.morphTargets, fps);
            let clip = gltf.animations[ 0 ].clone();
            mixers[i].clipAction(clip).setDuration(horseAnimSpeed).play();
          }
          horseGroup.visible = false;
          scene.add(horseGroup);
          resolve();

    
          // mixer = new THREE.AnimationMixer( mesh );
    
          // mixer.clipAction( gltf.animations[ 0 ] ).setDuration( 1 ).play();
    
        } );
    
        // loader.load("./horse.glb", (gltf) => {
        //   //geometry = new THREE.BufferGeometry().fromGeometry(geometry);

        //   // meshes[0] = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( {
        //   //   vertexColors: THREE.FaceColors,
        //   //   morphTargets: true
        //   // } ) );
        //   //geometry.computeVertexNormals();
        //   let mat = new THREE.MeshPhongMaterial({
        //     // vertexColors: THREE.FaceColors,
        //     // shading: THREE.SmoothShading,
        //     //transparent:true,
        //     //map:ffttexture,
        //     side: THREE.DoubleSide,
        //     //morphNormals: true,
        //     // color: 0xffffff,
        //     morphTargets: true,
        //     transparent: true,
        //     opacity: 0.0,
        //     //blending:THREE.AdditiveBlending,
        //     color: new THREE.Color(1.0, 0.5, 0.0),
        //     //morphNormals: true,
        //     //shading: THREE.SmoothShading
        //     //morphTargets: true
        //   });
        //   horseMaterial = mat;
        //   //mat.reflectivity = 1.0;
        //   //mat.specular = new THREE.Color(0.5,0.5,0.5);
        //   //mat.emissive = new THREE.Color(0.5,0,0);
        //   //        mat.wireframe = true;
        //   meshes[0] = new THREE.Mesh(geometry, mat);


        //   meshes[0].scale.set(1.5, 1.5, 1.5);
        //   meshes[0].rotation.y = 0.5 * Math.PI;
        //   meshes[0].position.y = 0;


        //   for (let i = 1; i < HORSE_NUM; ++i) {
        //     meshes[i] = meshes[0].clone();
        //     //           meshes[i].material =  new THREE.MeshPhongMaterial( {
        //     //         // vertexColors: THREE.FaceColors,
        //     //          // shading: THREE.SmoothShading,
        //     //          //transparent:true,
        //     //          //map:ffttexture,
        //     //         // side:THREE.DoubleSide,
        //     // //            morphNormals: true,
        //     //            // color: 0xffffff,
        //     // 						morphTargets: true,
        //     //             transparent: true,
        //     //             opacity:0.5,
        //     //                         color:new THREE.Color(1.0,0.5,0.0)

        //     // 						//morphNormals: true,
        //     // 						//shading: THREE.SmoothShading//,
        //     //             //morphTargets: true
        //     //         } );;
        //     meshes[i].position.x = (Math.floor((Math.random() - 0.5) * 10)) * 450;
        //     meshes[i].position.z = (Math.floor((Math.random() - 0.5) * 10)) * 150;
        //     meshes[i].position.y = 0/*(Math.random() - 0.6) * 1000*/;
        //   }

        //   for (let i = 0; i < HORSE_NUM; ++i) {
        //     horseGroup.add(meshes[i]);
        //     //scene.add( meshes[i] );
        //     mixers[i] = new THREE.AnimationMixer(meshes[i]);
        //     let clip = THREE.AnimationClip.CreateFromMorphTargetSequence('gallop', geometry.morphTargets, fps);
        //     mixers[i].clipAction(clip).setDuration(horseAnimSpeed).play();
        //   }
        //   horseGroup.visible = false;
        //   scene.add(horseGroup);
        //   resolve();
        //});
      });
    })();


    // var gto;
    // var horseGroups = [];
    // try {
    //   var shapes = [];
    //   for (var i = 0; i < 11; ++i) {
    //     var id = 'horse' + ('0' + i).slice(-2);
    //     var path = fs.readFileSync('./media/' + id + '.json', 'utf-8');
    //     // デシリアライズ
    //     shape = sf.deserialize(JSON.parse(path));

    //     shape = shape.toShapes();
    //     var shapeGeometry = new THREE.ShapeGeometry(shape);
    //     shapes.push({ name: id, shape: shapeGeometry });
    //   }

    //   var ggroup = new THREE.Group();
    //   for (var i = 0; i < 1; ++i) {
    //     var group = new THREE.Group();
    //     shapes.forEach(function (sm) {
    //       var shapeMesh = createShape(sm.shape, 0xFFFF00, 0, 0, 0, 0, 0, 0, 1.0);
    //       shapeMesh.visible = false;
    //       shapeMesh.name = sm.name;
    //       group.add(shapeMesh);
    //     });
    //     group.position.x = 0;
    //     group.position.y = 0;
    //     group.position.z = 0.0;
    //     horseGroups.push(group);
    //     ggroup.add(group);
    //   }
    //   scene.add(ggroup);
    //   ggroup.name = 'world';

    //   //d3.select('#svg').remove();
    // } catch (e) {
    //   console.log(e + '\n' + e.stack);
    // }

    //   var horseGroups = [];
    //   window.addEventListener('resize', function () {
    // //    WIDTH = window.innerWidth;
    // //    HEIGHT = window.innerHeight;
    //     // renderer.setSize(WIDTH, HEIGHT);
    //     // camera.aspect = WIDTH / HEIGHT;
    //     // camera.position.z = (WIDTH / 2.0) * HEIGHT / WIDTH;
    //     // camera.updateProjectionMatrix();
    //   });


    // var gto;
    // try {

    // } catch (e) {
    //   console.log(e + '\n' + e.stack);
    // }


    // scene.add(fftmesh);

    // Particles

    // {
    //   let material = new THREE.SpriteMaterial({
    //     map: new THREE.CanvasTexture(this.generateSprite()),
    //     blending: THREE.AdditiveBlending,
    //     transparent: true
    //   });
    //   for (var i = 0; i < 1000; i++) {
    //     let p = new THREE.Sprite(material);
    //     p.visible = false;
    //     this.initParticle(p, 207.273 * 1000 - 1500 + i * 10);
    //     scene.add(p);
    //   }
    // }


  }

  // 馬のフェードイン・フェードアウト
  horseFadein() {
    let fadein = new TWEEN.default.Tween({ opacity: 0 });
    let self = this;
    fadein.to({ opacity: 1.0 }, 5000);
    fadein.onUpdate(function () {
      self.meshes.forEach((d) => {
        d.material.opacity = this.opacity;
        d.material.needsUpdate = true;
      });
    });
    fadein.onStart(() => {
      self.horseGroup.visible = true;
    });
    return fadein.start.bind(fadein);
  }

  horseFadeout() {
    let fadeout = new TWEEN.default.Tween({ opacity: 1.0 });
    let self = this;
    fadeout.to({ opacity: 0.01 }, 3000);
    fadeout.onUpdate(function () {
      self.meshes.forEach((d) => {
        d.material.opacity = this.opacity;
        d.material.needsUpdate = true;
      });
    });
    fadeout.onComplete(() => {
      self.horseGroup.visible = false;
    });
    return fadeout.start.bind(fadeout);
  }

  // シリンダーの回転
  rotateCilynder() {
    let rotateCilynder = new TWEEN.default.Tween({ time: 0 });
    let self = this;
    var ry = 0;
    rotateCilynder
      .to({ time: self.endTime }, 1000 * self.endTime)
      .onUpdate(()=> {
        //camera.position.x = radius * Math.sin( theta );
        //camera.rotation.z += 0.1;//radius * Math.cos( theta );
        //wmesh.rotation.x += 0.01;
        //wmesh.geometry.rotateY(0.05 * frameDelta);
        //theta += 0.01 * frameDelta;
        //ry += 0.001 * frameDelta;
        this.camera.lookAt(this.camera.target);
      });
    return rotateCilynder;
  }

  // カメラワーク

  cameraTween() {
    let cameraTween = new TWEEN.default.Tween({ x: 0, y: 0, z: 1000, opacity: 1.0 });
    cameraTween.to({ x: 0, z: this.radius, y: 2000, opacity: 0.0 }, 1000);
    self = this;
    //cameraTween.delay(20.140 * 1000 - 1500);
    cameraTween.onUpdate(function () {
      self.fftmesh.material.opacity = 1.0 - this.opacity;
      self.fftmesh2.material.opacity = 1.0 - this.opacity;
      self.wmesh.material.opacity = this.opacity;
      self.camera.position.x = this.x;
      self.camera.position.y = this.y;
    });
    cameraTween.onStart(function () {
      self.fftmesh.visible = true;
      self.fftmesh2.visible = true;
    });
    cameraTween.onComplete(function () {
      self.wmesh.visible = false;
    });
    var cameraTween11 = new TWEEN.default.Tween({ theta: 0 });
    cameraTween11.to({ theta: -2 * Math.PI }, 11587);
    cameraTween11.onUpdate(function () {
      self.camera.position.x = Math.sin(this.theta) * self.radius;
      self.camera.position.z = Math.cos(this.theta) * self.radius;
    });
    cameraTween.chain(cameraTween11);
    return cameraTween;
  }

  cameraTween2() {
    let cameraTween2 = new TWEEN.default.Tween({ x: 0, y: 2000, z: 1000, opacity: 0.0 });
    let self = this;
    cameraTween2.to({ x: 0, y: 0, opacity: 1.0 }, 1000);
    cameraTween2.onUpdate(function () {
      self.fftmesh.material.opacity = 1.0 - this.opacity;
      self.fftmesh2.material.opacity = 1.0 - this.opacity;
      self.wmesh.material.opacity = this.opacity;
      self.camera.position.x = this.x;
      self.camera.position.y = this.y;
    });
    cameraTween2.onStart(function () {
      self.wmesh.visible = true;
    });
    cameraTween2.onComplete(function () {
      self.fftmesh.visible = false;
      self.fftmesh2.visible = false;
    });
    return cameraTween2;
  }

  cameraTween4() {
    let cameraTween4 = new TWEEN.default.Tween({ x: 0, y: 2000, z: 1000, opacity: 1.0 });
    let self = this;
    cameraTween4.to({ x: 0, y: 1000, z: 1000 }, 1000);
    cameraTween4.onUpdate(function () {
      self.camera.position.x = this.x;
      self.camera.position.y = this.y;
    });
    var cameraTween41 = new TWEEN.default.Tween({ theta: 0 });
    cameraTween41.to({ theta: 2 * Math.PI }, 18300);
    cameraTween41.onUpdate(function () {
      self.camera.position.x = Math.sin(this.theta) * self.radius;
      self.camera.position.z = Math.cos(this.theta) * self.radius;
    });
    cameraTween4.chain(cameraTween41);

    return cameraTween4;
  }

  update(time,fft=true) {
    // ctx.fillStyle = 'rgba(0,0,0,0.2)';
    // //ctx.fillRect(0,0,TEXW,TEXH);
    this.time = time;
    let TEXH = this.TEXH;
    let TEXW = this.TEXW;
    let ctx = this.ctx;

    this.ctx.clearRect(0, 0, TEXW, TEXH);
    let waveCount = ~~(time * this.sampleRate);
    let frameNo = ~~(time * this.fps);
    let wsize = 1024;
    let pat = (((time * 1000 + 179) / 105) & 3) == 0;
    if(fft){
      for (let i = 0; i < wsize; ++i) {
        let r = 0, l = 0;
        if ((waveCount + i) < (this.chR.length)) {
          r = this.chR[waveCount + i];
          l = this.chL[waveCount + i];
        }
  
        let hsll = 'hsl(' + Math.floor(Math.abs(r) * 200 + 250) + ',100%,50%)';
        let hslr = 'hsl(' + Math.floor(Math.abs(l) * 200 + 250) + ',100%,50%)';
  
  
        // if(pat){
        //   r = (r != 0 ? (r > 0 ? 1 : -1) : 0 ); 
        //   l = (l != 0 ? (l > 0 ? 1 : -1) : 0 ) ; 
        // }
        ctx.fillStyle = hsll;
        if (r > 0) {
          ctx.fillRect(TEXW / 4 * 3 - r * TEXW / 4 - TEXW / wsize / 2, i * TEXH / wsize, r * TEXW / 4, TEXH / wsize);
        } else {
          ctx.fillRect(TEXW / 4 * 3 - TEXW / wsize / 2, i * TEXH / wsize, -r * TEXW / 4, TEXH / wsize);
        }
  
        ctx.fillStyle = hslr;
        if (l > 0) {
          ctx.fillRect(TEXW / 4  - l * TEXW / 4 - TEXW / wsize / 2, i * TEXH / wsize, l * TEXW / 4, TEXH / wsize);
        } else {
          ctx.fillRect(TEXW / 4 - TEXW / wsize / 2, i * TEXH / wsize, -l * TEXW / 4, TEXH / wsize);
        }
      }
  
      this.fftmesh.position.x -= this.fftmeshSpeed;
  
      if (this.fftmesh.position.x < -4096)
        this.fftmesh.position.x = 0;
  
      this.fftmesh2.position.x -= this.fftmeshSpeed;
  
      if (this.fftmesh2.position.x < 0)
        this.fftmesh2.position.x = 8192;
  
      // fft.forward(chR.subarray(waveCount,waveCount + fftsize));
      // var pw = TEXH / (fftsize/2); 
      // var spectrum = fft.real;
      // for(var x = 0,e = fftsize/2 ;x < e;++x){
      //   let db = -30 + Math.log10(Math.abs(spectrum[x])) * 10;
      //   let h = (120 + db) * TEXH / 240;
      //   let hsl = 'hsl(' + Math.floor((120 + db) / 120 * 150 + 260) + ',100%,50%)';
      //   ctx.fillStyle = hsl;
      //   ctx.fillRect(x * pw,TEXH/2 - h,pw,h);
      // }
      // fft.forward(chL.subarray(waveCount,waveCount + fftsize));
      // spectrum = fft.real;
      // for(var x = 0,e = fftsize/2 ;x < e;++x){
      //   let db = -30 + Math.log10(Math.abs(spectrum[x])) * 10;
      //   let h = (120 + db) * TEXH / 240;
      //   let hsl = 'hsl(' + Math.floor((120 + db) / 120 * 150 + 260) + ',100%,50%)';
      //   ctx.fillStyle = hsl;
      //   ctx.fillRect(x * pw,TEXH / 2,pw,h);
      // }
  
      // {
      //   let idx = parseInt(index,10);
      //   for (var i = 0, end = horseGroups.length; i < end; ++i) {
      //     var g = horseGroups[i];
      //     g.getObjectByName('horse' + ('00' + idx.toString(10)).slice(-2)).visible = true;
      //     if (idx == 0) {
      //       g.getObjectByName('horse10').visible = false;
      //     } else {
      //       g.getObjectByName('horse' + ('00' + (idx - 1).toString(10)).slice(-2)).visible = false;
      //     }
      //   } 
      // }
  
      this.ffttexture.needsUpdate = true;
      this.ffttexture2.needsUpdate = true;      

    }

    this.camera.lookAt(this.camera.target);


    (frameNo & 1) &&
      this.mixers.forEach((mixer) => {
        mixer.update(1 / this.fps * 2);
      });

  }


  render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    if (this.renderToScreen) {

      renderer.render(this.scene, this.camera);

    } else {

			let backup = renderer.getRenderTarget();
			renderer.setRenderTarget(writeBuffer);
			renderer.clear()
      renderer.render(this.scene, this.camera);
			renderer.setRenderTarget(backup);

      //renderer.render(this.scene, this.camera, writeBuffer, this.clear);

    }

  }

generateSprite() {
  var canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  var context = canvas.getContext('2d');
  var gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(0,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(0,0,64,1)');
  gradient.addColorStop(1, 'rgba(0,0,0,1)');
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

initParticle(particle, delay) {
  //let hsl = 'hsl(' + Math.floor(Math.abs(r) * 200 + 250) + ',100%,50%)';

  //var particle = this instanceof THREE.Sprite ? this : particle;
  //var particle = this instanceof THREE.Sprite ? this : particle;
  let timeMs = this.time * 1000;
  var delay = delay !== undefined ? delay : 0;
  particle.position.set(Math.random() * 500 - 250, Math.random() * 500 - 250, -4000);
  particle.scale.x = particle.scale.y = Math.random() * 500 + 50;
  new TWEEN.default.Tween(particle)
    .delay(delay)
    .to({}, 5000)
    .onComplete(this.initParticle.bind(this,particle,0))
    .onStart(function () {
     particle.visible = true;
    })
    .start(timeMs);

  new TWEEN.default.Tween(particle.position)
    .delay(delay)
    .to({ x: Math.random() * 500 - 250, y: Math.random() * 500 - 250, z: Math.random() * 1000 + 500 }, 10000)
    .to({ z: Math.random() * 1000 + 500 }, 5000)
    .start(timeMs);

  new TWEEN.default.Tween(particle.scale)
    .delay(delay)
    .to({ x: 0.01, y: 0.01 }, 5000)
    .start(timeMs);
}  

setSize(width,height){
  this.camera.aspect = width / height;
  this.camera.updateProjectionMatrix();
}

}

