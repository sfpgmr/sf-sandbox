class PSG extends AudioWorkletProcessor {
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

  init({memory,bufferStart = 0,readOffset,writeOffset,bufferSize,endian})
  {
//    const module = new WebAssembly.Module(wasmBinary);
    //this.buffer = new Float32Array(memory.buffer,bufferStart,bufferSize / 4);
    this.readOffset = new Int32Array(memory.buffer,readOffset);
    this.writeOffset = new Int32Array(memory.buffer,writeOffset);
    this.dataView = new DataView(memory.buffer);
    this.bufferStart = this.dataView.getInt32(bufferStart,endian);
    this.bufferSize = this.dataView.getInt32(bufferSize,endian);
    this.bufferMask = (this.bufferSize - 1) & 0xffffffff;
    this.memory = memory;
    this.offset = 0;
    this.enable = true;
    this.endian = endian;
  }

  process (inputs, outputs, parameters) {
      if(this.enable){
        const output = outputs[0];
        const dv = this.dataView;
        const endian = this.endian;

        let offset = (Atomics.load(this.readOffset,0) ) + this.bufferStart;
        const  woffset = Atomics.load(this.writeOffset,0);

        const e = output[0].length;
        for (let channel = 0; channel < output.length; ++channel) {
          const o = output[channel];
          for (let i = 0; i < e; ++i) {
//            o[i] = (i & 1) ? 1.0 : -1.0;

            o[i] = dv.getFloat32(offset + (i << 2),endian);
            console.log(dv.getFloat32(offset + (i << 2),endian));
          }
        }
        Atomics.store(this.readOffset,0,(offset + e * 4 - this.bufferStart) & this.bufferMask);
      }
      return true;
  }

  static get parameterDescriptors () {
    const parameters = [];
    parameters.push({
      name: 'enable',
      defaultValue: 0,
      minValue: 0,
      maxValue: 1,
      automationRate: "k-rate"
    });
    return parameters;
  }

}
registerProcessor("PSG", PSG);
