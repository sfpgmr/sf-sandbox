"use strict";

export default class SFCapturePass extends THREE.Pass {
	constructor(width = 0, height = 0) {
		super();

    this.buffers = [];
    for (let i = 0; i < 4; ++i) {
      this.buffers.push(new Uint8Array(width * height * 4));
    }
    this.bufferIndex = 0;
    this.currentIndex = 0;
    this.width = width;
    this.height = height;


    this.uniforms = THREE.UniformsUtils.clone(THREE.CopyShader.uniforms);

		this.material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: THREE.CopyShader.vertexShader,
			fragmentShader: THREE.CopyShader.fragmentShader
		});

		this.camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
		this.scene = new THREE.Scene();

		this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
		this.scene.add(this.quad);
	}

	render(renderer, writeBuffer, readBuffer, delta, maskActive) {
    this.currentIndex = this.bufferIndex;
    renderer.readRenderTargetPixels(readBuffer, 0, 0, this.width, this.height, this.buffers[this.bufferIndex]);
    this.bufferIndex = (this.bufferIndex + 1) & 3;

		this.uniforms["tDiffuse"].value = readBuffer.texture;
		this.quad.material = this.material;
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

