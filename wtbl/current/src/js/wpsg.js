class WSG extends AudioWorkletProcessor {
  constructor(options){
    super();
    this.options = options;

    if(options.processorOptions){
      this.memory = new WebAssembly.Memory({initial:1,maximum:1});
      this.dataview = new DataView(this.memory.buffer);
      const userOptions = options.processorOptions;
      
      (!userOptions.sampleRate) && (userOptions.sampleRate = sampleRate);

      if(userOptions.wasmBinary){
        const module = new WebAssembly.Module(userOptions.wasmBinary);
        const instance = new WebAssembly.Instance(module, {env:{memory:this.memory}});
        this.module = instance.exports;
        this.module.init(userOptions.clock,userOptions.sampleRate);
        this.module.reset();
        this.enable = true;

        this.port.onmessage = (event)=>{
          if(this.enable){
            const message = event.data;
            switch(message.message){
              case 'writeReg':
                this.module.writeReg(message.reg,message.value);
                this.port.postMessage({
                  check:this.module.readReg(message.reg) == message.value,
                  value:message.value,
                  read:this.module.readReg(message.reg),
                  reg:message.reg
                });
                break;
            }
          }
        }        
      }
    }
  
  }


  static get parameterDescriptors () {
      const parameters = [];

      for(let i = 0;i < 5;++i){
        parameters.push({
          name: 'enable_' + String.fromCharCode(i),
          defaultValue: 0,
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate"
        });

        // pitch
        parameters.push({
          name: 'pitch_' + String.fromCharCode(i),
          defaultValue: 440,
          minValue: 0,
          maxValue: 20000,
          automationRate: "k-rate"
        });

        // volume
        parameters.push({
          name: 'volume_' + String.fromCharCode(i),
          defaultValue: 0.5,
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate"
        });

    }
    return parameters;
  }




  process (inputs, outputs, parameters) {
      
      
      if(this.enable){
        for(let i = 0;i < 5;++i){
          parameters['enable_' + i]
        }
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
registerProcessor("WSG", PSG);
