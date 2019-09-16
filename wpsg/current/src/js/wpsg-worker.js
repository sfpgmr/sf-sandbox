let wpsg, play = false;

class PSGWorker {
	constructor({ wasmBinary, memory, sampleRate = 44100, endian }) {
		const module = new WebAssembly.Module(wasmBinary);
		const instance = new WebAssembly.Instance(module, { env: { memory: memory },imports : {sin:Math.sin,cos:Math.cos,exp:Math.exp,sinh:Math.sinh,pow:Math.pow} });
		this.memory = memory;
		this.module = instance.exports;
		this.timbre = this.module.initTestTimbre();
		this.enable = true;
		this.endian = endian;
		this.dv = new DataView(memory.buffer);
		this.array = new Uint32Array(memory.buffer);
	}

	process() {
		this.module.process();
	}

	fill()
	{
		this.module.fill();
	}

	keyOn(){
		this.module.keyOnTimbre(this.timbre);
	}

	keyOff(){
		this.module.keyOffTimbre(this.timbre);
	}

	
}

self.addEventListener('message',(message) => {
	const m = message.data;
	switch (m.message) {
		case 'init':
			if (!wpsg) {
				wpsg = new PSGWorker(m);
			}
			self.postMessage({message:'init'});
			break;
		case 'play':
			if (!play && wpsg && wpsg.enable) {
				play = true;
				process();
			}
			break;
		case 'stop':
			play = false;
			break;
		case `fill`:
			if (wpsg.enable) {
				wpsg.module.fill();
				postMessage('fill done.');
			}
			break;
	}
});
let keyon = 100;
let keyflag = false;
function process() {
	if (play) {
		setTimeout(process, 25);
	}
	--keyon;
	if(keyon == 0){
		keyon = 50;
		if(keyflag){
			wpsg.keyOn();
		} else {
			wpsg.keyOff();
		}
		keyflag != keyflag;
	}
	wpsg.process();
}



