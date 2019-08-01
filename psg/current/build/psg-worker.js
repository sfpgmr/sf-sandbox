let psg, play = false;

class PSGWorker {
	PSGWorker({ wasmBinary, memory, clock = 3580000, sampleRate = 44100, bufferStart = 0, readOffset, writeOffset, bufferSize }) {
		const module = new WebAssembly.Module(wasmBinary);
		const instance = new WebAssembly.Instance(module, { env: { memory: memory } });
		this.module = instance.exports;
		this.module.init(clock, sampleRate_);
		this.module.reset();
		this.enable = true;
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
				psg = new PSGWorker({ m });
			}
			break;
		case 'play':
			if (!play) {
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
			if (this.enable) {
				this.module.writeReg(message.reg, message.value);
				postMessage({
					check: this.module.readReg(message.reg) == message.value,
					value: message.value,
					read: this.module.readReg(message.reg),
					reg: message.reg
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



