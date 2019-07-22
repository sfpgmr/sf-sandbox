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
          case 'writeReg':
            if(this.enable){
                this.module.writeReg(message.reg,message.value);
                this.port.postMessage({
                  check:this.module.readReg(message.reg) == message.value,
                  value:message.value,
                  read:this.module.readReg(message.reg),
                  reg:message.reg
              });
            }
            break;
        }
    }
  }

  init({wasmBinary,memory,clock = 3580000,sampleRate_ = sampleRate})
  {
    const module = new WebAssembly.Module(wasmBinary);
    const instance = new WebAssembly.Instance(module, {env:{memory:memory}});
    this.module = instance.exports;
    this.module.init(clock,sampleRate_);
    this.module.reset();
    this.enable = true;
  }

  process (inputs, outputs, parameters) {
      if(this.enable){
        let output = outputs[0];
        for (let i = 0,e = output[0].length; i < e; ++i) {

          const out = this.module.calc() / 16384;

          for (let channel = 0; channel < output.length; ++channel) {
              output[channel][i] = out;
          }
        }
      }
      return true;
  }
}
registerProcessor("PSG", PSG);
