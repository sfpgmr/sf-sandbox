import fs from 'fs';
import path from 'path';
import decoder from 'wav-decoder';
import lzbase62 from 'lzbase62';

function denodeify(nodeFunc){
    var baseArgs = Array.prototype.slice.call(arguments, 1);
    return function() {
        var nodeArgs = baseArgs.concat(Array.prototype.slice.call(arguments));
        return new Promise((resolve, reject) => {
            nodeArgs.push((error, data) => {
                if (error) {
                    reject(error);
                } else if (arguments.length > 2) {
                    resolve(Array.prototype.slice.call(arguments, 1));
                } else {
                    resolve(data);
                }
            });
            nodeFunc.apply(null, nodeArgs);
        });
    }
}

const readFile = denodeify(fs.readFile);
const readDir = denodeify(fs.readdir);
const writeFile = denodeify(fs.writeFile);

readDir('./res/out/')
.then((files)=>{
    return files.filter(function(file){
        return fs.statSync('./res/out/' + file).isFile() && /.*\.wav$/ig.test(file); //絞り込み
    });
})
.then((files)=>{
  let pr = Promise.resolve(0);  
  files.forEach((file)=>{
    console.log(file);
    (function(p){
      var f = new String(p);
    pr = pr.then(readFile.bind(null,'./res/out/' + f))
    .then(d => decoder.decode(d))
    .then(audioData => {
      let sampleData = {sampleRate:audioData.sampleRate};
      sampleData.samples = '';
      let samples = Array.prototype.slice.call(audioData.channelData[0].map((d)=>{
        return Math.min(((d + 1.0) * 128.0),255.0) >>> 4;        
      }));
      if((samples.length % 2) != 0){
        samples.push(8);
      }
      for(let i = 0,e = samples.length;i < e;i+=2){
        sampleData.samples += ('0' + ((samples[i] << 4) | (samples[i+1])).toString(16)
        ).slice(-2);
      }
      sampleData.samples = lzbase62.compress(sampleData.samples);
      return writeFile('../res/' + path.basename(f,'.wav') + '_lz.json',JSON.stringify(sampleData,null,' '),'utf-8');
    });
    })(file);
  });
  return pr;
})
.then(()=>{
  console.log('end');
})
.catch((e)=>{
  console.log(e);  
});


// readFile('./res/bd1.wav')
// .then(buffer => decoder.decode(buffer))
// .then((audioData)=>{
//   console.log(audioData.sampleRate);
//   // console.log(audioData.channelData[0]); // Float32Array
//   // console.log(audioData.channelData[1]); // Float32Array    
// });



