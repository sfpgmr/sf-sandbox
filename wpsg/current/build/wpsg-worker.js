let psg, play = false;

class PSGWorker {
	constructor({ wasmBinary, memory, clock = 3580000, sampleRate = 44100, bufferStart = 0, readOffset, writeOffset, bufferSize,endian }) {
		const module = new WebAssembly.Module(wasmBinary);
		const instance = new WebAssembly.Instance(module, { env: { memory: memory } });
		this.memory = memory;
		this.module = instance.exports;
		this.module.init(clock, sampleRate);
		this.module.reset();
		this.enable = true;
		this.endian = endian;
		this.writeOffset = writeOffset / 4;
		this.readOffset = readOffset / 4;
		this.dv = new DataView(memory.buffer);
		this.array = new Uint32Array(memory.buffer);
		this.bufferStart = bufferStart;
		this.bufferSize = bufferSize;
		this.bufferMask = Atomics.load(this.array,bufferSize / 4) - 1;
	}

	render() {
		// const ro = Atomics.load(this.array,this.readOffset) ;
		// let wo = Atomics.load(this.array,this.writeOffset);

		// while(wo != ro){
		// 	let o = this.module.calc() / 16384;
		// 	this.dv.setFloat32(wo + this.bufferStart,o,this.endian);
		// 	wo =  (wo + 4) & this.bufferMask;
		// }

		// Atomics.store(this.array,this.writeOffset,wo);

		this.module.render();
	}
}

self.addEventListener('message',(message) => {
	const m = message.data;
	switch (m.message) {
		case 'init':
			if (!psg) {
				psg = new PSGWorker(m);
			}
			self.postMessage({message:'init'});
			break;
		case 'play':
			if (!play && psg && psg.enable) {
				play = true;
				//psg.module.reset();
				//psg.module.fill();
				render();
			}
			break;
		case 'stop':
			play = false;
			break;
		case 'writeReg':
			if (psg.enable) {
				psg.module.writeReg(m.reg, m.value);
				postMessage({
					check: psg.module.readReg(m.reg) == m.value,
					value: m.value,
					read: psg.module.readReg(m.reg),
					reg: m.reg
				});
			}
			break;
		case `fill`:
			if (psg.enable) {
				psg.module.fill();
				postMessage('fill done.');
			}
			break;
		case 'calc':
			if(psg.enable){
				let out = psg.module.calc();
				postMessage(out);
			}
	}
});

function render() {
	if (play) {
		setTimeout(render, 25);
	}
	psg.render();
}



