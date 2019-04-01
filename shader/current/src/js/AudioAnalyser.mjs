//
//The MIT License (MIT)
//
//Copyright (c) 2015 Satoshi Fujiwara
//
//Permission is hereby granted, free of charge, to any person obtaining a copy
//of this software and associated documentation files (the "Software"), to deal
//in the Software without restriction, including without limitation the rights
//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the Software is
//furnished to do so, subject to the following conditions:
//
//The above copyright notice and this permission notice shall be included in
//all copies or substantial portions of the Software.
//
//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//THE SOFTWARE.

import denodeify from './denodeify.mjs';
import *  as fs  from 'fs';

var readFile = denodeify(fs.readFile);

export default class Audio {
  load() {
    var context = new AudioContext();

    function toArrayBuffer(buffer) {
      var ab = new ArrayBuffer(buffer.length);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
          view[i] = buffer.readUInt8(i);
      }
      return ab;
    }
    let self = this;
   return  readFile('./media/Rydeen.wav')
    .then(function(data){
      return new Promise((resolve,reject)=>{
        var arrayBuf = toArrayBuffer(data);
        context.decodeAudioData(arrayBuf,function(buffer){
          if(!buffer){
            console.log('error');
          }
          let source = context.createBufferSource();
          self.source = source;
          source.buffer = buffer;
          source.connect(context.destination);
          let analyser = context.createAnalyser();
          self.analyser = analyser;
          source.connect(analyser);
          self.context = context;
          resolve(source);
        },function(err){
          reject(err);
        });
      });
    });
  }
}
