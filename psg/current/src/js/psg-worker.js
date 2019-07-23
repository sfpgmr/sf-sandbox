let psg, play = false;

class PSGWorker {
	PSGWorker({ wasmBinary, memory, clock = 3580000, sampleRate_ = sampleRate }) {
		const module = new WebAssembly.Module(wasmBinary);
		const instance = new WebAssembly.Instance(module, { env: { memory: memory } });
		this.module = instance.exports;
		this.module.init(clock, sampleRate_);
		this.module.reset();
		this.enable = true;
  }
  render(){
    
  };
}

onmessage((message) => {
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
				setTimeout(render, 25);
			}
			break;
		case 'stop':
			play = false;
			break;
	}
});

function render(){
  if(play){
    setTimeout(render,25);
  }
  psg.render();
}



