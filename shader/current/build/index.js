(function () {
  'use strict';

  /**
   * @author SFPGMR
   */

  const NUM_X = 16, NUM_Y = 12;
  const NUM_OBJS = NUM_X * NUM_Y;

  class HorseAnim extends THREE.Pass {
    constructor(width, height) {
      super();

      const scene = this.scene = new THREE.Scene();

      // カメラの作成
      const camera = this.camera = new THREE.PerspectiveCamera(90.0, width / height);
      camera.position.x = 0.0;
      camera.position.y = 0.0;
      camera.position.z = 250.0;//(WIDTH / 2.0) * HEIGHT / WIDTH;
      camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));
      this.width = width;
      this.height = height;

      // SVGファイルから馬のメッシュを作る
      this.resLoading = d3.text('./horse07-2.svg').then(svgText=>{
        const svgLoader = new THREE.SVGLoader();
        const paths = svgLoader.parse(svgText).paths;
        //console.log(paths);
        const groups = this.groups = [];
    
        for (let y = 0; y < NUM_Y; ++y) {
          for (let x = 0; x < NUM_X; ++x) {
            const g = new THREE.Group();
            g.position.set((x - NUM_X / 2) * 80, (NUM_Y / 2 - y) * 50, 1.0);
            groups.push(g);
            scene.add(g);
          }
        }
    
        for (let i = 0; i < paths.length; i++) {
          const path = paths[i];
    
          const shapes = path.toShapes(true, false);
    
    
    
          for (let j = 0; j < shapes.length; ++j) {
            const shape = shapes[j];
            const geometry = new THREE.ShapeBufferGeometry(shape);
            const positions = geometry.attributes.position.array;
    
            let sx = path.currentPath.currentPoint.x;
            let sy = path.currentPath.currentPoint.y;
            let ex = path.currentPath.currentPoint.x;
            let ey = path.currentPath.currentPoint.y;
    
            for (let k = 0, e = positions.length; k < e; k += 3) {
              sx = Math.min(sx, positions[k + 0/* x */]);
              sy = Math.min(sy, positions[k + 1/* y */]);
              ex = Math.max(ex, positions[k + 0/* x */]);
              ey = Math.max(ey, positions[k + 1/* y */]);
            }
    
            let cx = ex - (ex - sx) / 2;
            let cy = ey - (ey - sy) / 2;
    
            for (let k = 0, e = positions.length; k < e; k += 3) {
              positions[k + 0/* x */] -= cx;
              positions[k + 1] = (positions[k + 1] - cy) * -1;
              positions[k + 2] = 10.0;
            }
    
    
            for (let k = 0; k < NUM_OBJS; ++k) {
              const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0.5, 0.0, 0.0),
                side: THREE.DoubleSide,
                depthWrite: true
              });
              const mesh = new THREE.Mesh(geometry, material);
              mesh.scale.set(0.25, 0.25, 0.25);
              mesh.visible = false;
              groups[k].add(mesh);
            }
          }
        }
      });
      	//レンダリング
        this.ca = 360| 0;
        this.cb = 143 | 0;
        this.c = 0;
        this.index = 0;
    }

    setSize(width, height) {
      this.width = width;
      this.height = height;

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();

    }

    update() {

      this.c += 0.1;
  		const idx = this.index | 0;
  			for(let y = 0;y < NUM_Y;++y){
  				for(let x = 0;x < NUM_X;++x){
  	
  				let dist = Math.abs(Math.sqrt(Math.pow((x - NUM_X / 2) * NUM_X/NUM_Y,2) + Math.pow((y - NUM_Y / 2) ,2)));
  				let color_r = (Math.sin(dist + this.c) + 1.0) / 2.0; 
  				let color_g = (Math.sin(dist + this.c + Math.PI / 2.0) + 1.0) / 2.0; 
  				let color_b = (Math.sin(dist + this.c + Math.PI ) + 1.0) /2;
  				const g = this.groups[x + y * NUM_X];
  				const m = g.children;
  				// let curX = g.position.x + 4;
  				// if(curX > 640){
  				// 	curX = -640;
  				// }
   				// g.position.set(curX,g.position.y,g.position.z);

  		
  				for(let k = 0;k < 10;++k){
  					if (idx == k) {
  						m[k].visible = true;
  						m[k].material.color = new THREE.Color(color_r,color_g,color_b);
  					} else {
  						m[k].visible = false;
  					}
  				}
  			}
  		}

  		//0.041958041958042
  		this.ca -= this.cb;
  		if(this.ca <= 0){
  			++this.index;
  			this.ca += 360 | 0;
  		}

      if (this.index > 9) this.index = 0;    


    }

    render(renderer, writeBuffer, readBuffer, delta, maskActive) {

      if (this.renderToScreen) {
        renderer.render(this.scene, this.camera);

      } else {

  			let backup = renderer.getRenderTarget();
  			renderer.setRenderTarget(writeBuffer);
  			this.clear && renderer.clear();
        renderer.render(this.scene, this.camera);
  			renderer.setRenderTarget(backup);

        //renderer.render(this.scene, this.camera, writeBuffer, this.clear);

      }

    }
  }

  //The MIT License (MIT)

  // メイン
  window.addEventListener('load', async ()=>{

    var WIDTH = window.innerWidth , HEIGHT = window.innerHeight;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context,antialias: false, sortObjects: true,autoClear:false});

    renderer.setSize(WIDTH, HEIGHT);
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.id = 'console';
    renderer.domElement.className = 'console';
    renderer.domElement.style.zIndex = 0;

    d3.select('#content').node().appendChild(renderer.domElement);
    renderer.clear();


    // Post Effect
    let composer = new THREE.EffectComposer(renderer);
    composer.setSize(WIDTH, HEIGHT);

    var horseAnim = new HorseAnim(WIDTH,HEIGHT);
    await horseAnim.resLoading;
    horseAnim.renderToScreen = true;
    horseAnim.enabled = true;
    composer.addPass(horseAnim);

    window.addEventListener( 'resize', ()=>{
          WIDTH = window.innerWidth;
          HEIGHT = window.innerHeight;
  				renderer.setSize(WIDTH,HEIGHT);
          composer.setSize(WIDTH,HEIGHT);
    }
    , false );
    
    function render() {
      horseAnim.update();
      composer.render();
      requestAnimationFrame(render);
    }

    render();

  });

}());
