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
	}

	render() {
		this.module.render();
	};
}

self.addEventListener('message',(message) => {
	const m = message.data;
	switch (m.message) {
		case 'init':
			if (!psg) {
				psg = new PSGWorker(m);
			}
			break;
		case 'play':
			if (!play && psg && psg.enable) {
				play = true;
				psg.module.reset();
				psg.module.fill();
				setTimeout(render, 25);
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

	}
});

function render() {
	if (play) {
		setTimeout(render, 25);
	}
	psg.render();
}



