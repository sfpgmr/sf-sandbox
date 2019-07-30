class PSGWorklet extends AudioWorkletProcessor {
  constructor(){
    super();
    this.enable = false;
    this.sampleRate = sampleRate;
    this.port.onmessage = (event)=>{
        const message = event.data;
        switch(message.message){
          case 'init':
            if(!this.enable){
              this.init(message);
            } 
            break;
          case 'play':
            this.enable = true;
            break;
          case 'stop':
            this.enable = false;
            break;
        }
    }
  }

  init({memory,clock = 3580000,sampleRate_ = sampleRate,bufferStart = 0,readOffset,writeOffset,bufferSize})
  {
//    const module = new WebAssembly.Module(wasmBinary);
    this.buffer = new Float32Array(memory.buffer,bufferStart,bufferSize / 4);
    this.readOffset = readOffset;
    this.writeOffset = writeOffset;
    this.memory = memory;
    this.dataView = new DataView(this.memory.buffer);
    this.offset = 0;
//    const instance = new WebAssembly.Instance(module, {env:{memory:memory}});
    this.module = instance.exports;
    this.module.init(clock,sampleRate_);
    this.module.reset();
    this.enable = true;
  }

  process (inputs, outputs, parameters) {
      if(this.enable){
        const output = outputs[0];
        const buffer = this.buffer;
        let offset = this.offset | 0;
        if(offset >= this.buffer.byteLength) {
          this.offset = 0;
        }
        for (let channel = 0; channel < output.length; ++channel) {
          const o = output[channel];
          for (let i = 0,e = o.length; i < e; ++i) {
            o[i] = buffer[offset++];
          }
        }
        this.offset  = offset;
      }
      return true;
  }
}
registerProcessor("PSG", PSG);
