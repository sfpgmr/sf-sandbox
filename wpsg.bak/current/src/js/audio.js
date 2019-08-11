"use strict";
//// Web Audio API ラッパークラス ////

// MMLParserはmohayonaoさんのもの
// https://github.com/mohayonao/mml-iterator

import Syntax from "./Syntax.js";
//import Scanner from "./Scanner.js";
import MMLParser from "./MMLParser.js";
import DefaultParams from "./DefaultParams.js";
import lzbase62 from "./lzbase62.min.js";

// var fft = new FFT(4096, 44100);
const BUFFER_SIZE = 1024;
const TIME_BASE = 96;

// MIDIノート => 再生レート変換テーブル
var noteFreq = [];
for (var i = -69; i < 58; ++i) {
  noteFreq.push(Math.pow(2, i / 12));
}

// MIDIノート周波数 変換テーブル
var midiFreq = [];
for (let i = 0; i < 127; ++i) {
  midiFreq.push(midicps(i));
}
function midicps(noteNumber) {
  return 440 * Math.pow(2, (noteNumber - 69) * 1 / 12);
}

// 波形メモリ文字列(16進数32文字)をサンプル配列(-1.0-1.0 32個 )に変換する
export function decodeStr(bits, wavestr) {
  var arr = [];
  var n = bits / 4 | 0;
  var c = 0;
  var zeropos = 1 << (bits - 1);
  while (c < wavestr.length) {
    var d = 0;
    for (var i = 0; i < n; ++i) {
      d = (d << 4) + parseInt(wavestr.charAt(c++), '16');
    }
    arr.push((d - zeropos) / zeropos);
  }
  return arr;
}

var waves = [
  decodeStr(4,'9ABCDDEEEDDCBA975432110001123457'),
  decodeStr(4,'EEEEEEEEEEEEEEEE0000000000000000'),
  decodeStr(4,'7ACDEDCA742101247BDEDB7310137E70'),
  decodeStr(4,'EEEEEEEE00000000EEE000EEEEE00000'),
  decodeStr(4,'EE00CCD3EECCCCD71222200B122EE007'),
  decodeStr(4,'EC7AC75CED8AB627C834610397247207'),
  decodeStr(4,'CEEEECB97655568ABB96422235432137'),
  decodeStr(4,'8BED7DEDCB32101710368EDCE8302106'),
  // decodeStr(4, 'EEEEEEEEEEEEEEEE0000000000000000'),
  // decodeStr(4, '00112233445566778899AABBCCDDEEFF'),
  // decodeStr(4, '023466459AA8A7A977965656ACAACDEF'),
  // decodeStr(4, 'BDCDCA999ACDCDB94212367776321247'),
  // decodeStr(4, '7ACDEDCA742101247BDEDB7320137E78'),
  // decodeStr(4, 'ACCA779BDEDA66679994101267742247'),
  // decodeStr(4, '7EC9CEA7CFD8AB728D94572038513531'),
  // decodeStr(4, 'EE77EE77EE77EE770077007700770077'),
  decodeStr(4, 'EEEE8888888888880000888888888888')//ノイズ用のダミー波形
];



var waveSamples = [];
export function WaveSample(audioctx, ch, sampleLength, sampleRate) {

  this.sample = audioctx.createBuffer(ch, sampleLength, sampleRate || audioctx.sampleRate);
  this.loop = false;
  this.start = 0;
  this.end = (sampleLength - 1) / (sampleRate || audioctx.sampleRate);
}

export function createWaveSampleFromWaves(audioctx, sampleLength) {
  for (let i = 0, end = waves.length; i < end; ++i) {
    const sample = new WaveSample(audioctx, 1, sampleLength);
    waveSamples.push(sample);
    if (i != 8) {
      const wavedata = waves[i];
      const delta = 440.0 * wavedata.length / audioctx.sampleRate;
      let stime = 0;
      const output = sample.sample.getChannelData(0);
      const len = wavedata.length;
      let index = 0;
      let endsample = 0;
      for (var j = 0; j < sampleLength; ++j) {
        index = stime | 0;
        output[j] = wavedata[index];
        stime += delta;
        if (stime >= len) {
          stime = stime - len;
          endsample = j;
        }
      }
      sample.end = endsample / audioctx.sampleRate;
      sample.loop = true;
    } else {
      // ボイス8はノイズ波形とする
      var output = sample.sample.getChannelData(0);
      for (var j = 0; j < sampleLength; ++j) {
        output[j] = Math.random() * 2.0 - 1.0;
      }
      sample.end = sampleLength / audioctx.sampleRate;
      sample.loop = true;
    }
  }
}

// 参考：http://www.g200kg.com/archives/2014/12/webaudioapiperi.html
function fourier(waveform, len) {
  var real = new Float32Array(len), imag = new Float32Array(len);
  var wavlen = waveform.length;
  for (var i = 0; i < len; ++i) {
    for (var j = 0; j < len; ++j) {
      var wavj = j / len * wavlen;
      var d = waveform[wavj | 0];
      var th = i * j / len * 2 * Math.PI;
      real[i] += Math.cos(th) * d;
      imag[i] += Math.sin(th) * d;
    }
  }
  return [real, imag];
}

function createPeriodicWaveFromWaves(audioctx) {
  return waves.map((d, i) => {
    if (i != 8) {
      let waveData = waves[i];
      let freqData = fourier(waveData, waveData.length);
      return audioctx.createPeriodicWave(freqData[0], freqData[1]);
    } else {
      // ボイス波形はノイズ波形とする
      let waveData = [];
      for (let j = 0, e = waves[i].length; j < e; ++j) {
        waveData.push(Math.random() * 2.0 - 1.0);
      }
      let freqData = fourier(waveData, waveData.length);
      return audioctx.createPeriodicWave(freqData[0], freqData[1]);
    }
  });
}

// ドラムサンプル

const drumSamples = [
  { name: 'bass1', path: '../../common/sample/bd1_lz.json' }, // @9
  { name: 'bass2', path: '../../common/sample/bd2_lz.json' }, // @10
  { name: 'closed', path: '../../common/sample/closed_lz.json' }, // @11
  { name: 'cowbell', path: '../../common/sample/cowbell_lz.json' },// @12
  { name: 'crash', path: '../../common/sample/crash_lz.json' },// @13
  { name: 'handclap', path: '../../common/sample/handclap_lz.json' }, // @14
  { name: 'hitom', path: '../../common/sample/hitom_lz.json' },// @15
  { name: 'lowtom', path: '../../common/sample/lowtom_lz.json' },// @16
  { name: 'midtom', path: '../../common/sample/midtom_lz.json' },// @17
  { name: 'open', path: '../../common/sample/open_lz.json' },// @18
  { name: 'ride', path: '../../common/sample/ride_lz.json' },// @19
  { name: 'rimshot', path: '../../common/sample/rimshot_lz.json' },// @20
  { name: 'sd1', path: '../../common/sample/sd1_lz.json' },// @21
  { name: 'sd2', path: '../../common/sample/sd2_lz.json' },// @22
  { name: 'tamb', path: '../../common/sample/tamb_lz.json' }// @23
];

async function readDrumSample(audioctx) {
  for(const drumSample of drumSamples){
    let data = await (await fetch(drumSample.path)).json();
    let sampleStr = lzbase62.decompress(data.samples);
    let samples = decodeStr(4, sampleStr);
    let ws = new WaveSample(audioctx, 1, samples.length, data.sampleRate);
    let sb = ws.sample.getChannelData(0);
    for (let i = 0, e = sb.length; i < e; ++i) {
      sb[i] = samples[i];
    }
    waveSamples.push(ws);
  }
}

// export class WaveTexture { 
//   constructor(wave) {
//     this.wave = wave || waves[0];
//     this.tex = new CanvasTexture(320, 10 * 16);
//     this.render();
//   }

//   render() {
//     var ctx = this.tex.ctx;
//     var wave = this.wave;
//     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//     ctx.beginPath();
//     ctx.strokeStyle = 'white';
//     for (var i = 0; i < 320; i += 10) {
//       ctx.moveTo(i, 0);
//       ctx.lineTo(i, 255);
//     }
//     for (var i = 0; i < 160; i += 10) {
//       ctx.moveTo(0, i);
//       ctx.lineTo(320, i);
//     }
//     ctx.fillStyle = 'rgba(255,255,255,0.7)';
//     ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
//     ctx.stroke();
//     for (var i = 0, c = 0; i < ctx.canvas.width; i += 10, ++c) {
//       ctx.fillRect(i, (wave[c] > 0) ? 80 - wave[c] * 80 : 80, 10, Math.abs(wave[c]) * 80);
//     }
//     this.tex.texture.needsUpdate = true;
//   }
// };

/// エンベロープジェネレーター
export class EnvelopeGenerator {
  constructor(voice, attack, decay, sustain, release) {
    this.voice = voice;
    //this.keyon = false;
    this.attackTime = attack || 0.0005;
    this.decayTime = decay || 0.05;
    this.sustainLevel = sustain || 0.5;
    this.releaseTime = release || 0.5;
    this.v = 1.0;
    this.keyOnTime = 0;
    this.keyOffTime = 0;
    this.keyOn = false;
  }

  keyon(t, vel) {
    this.v = vel || 1.0;
    var v = this.v;
    var t0 = t || this.voice.audioctx.currentTime;
    var t1 = t0 + this.attackTime;
    var gain = this.voice.gain.gain;
    gain.cancelScheduledValues(t0);
    gain.setValueAtTime(0, t0);
    gain.linearRampToValueAtTime(v, t1);
    gain.linearRampToValueAtTime(this.sustainLevel * v, t1 + this.decayTime);
    //gain.setTargetAtTime(this.sustain * v, t1, t1 + this.decay / v);
    this.keyOnTime = t0;
    this.keyOffTime = 0;
    this.keyOn = true;
  }

  keyoff(t) {
    var voice = this.voice;
    var gain = voice.gain.gain;
    var t0 = t || voice.audioctx.currentTime;
    //    gain.cancelScheduledValues(this.keyOnTime);
    gain.cancelScheduledValues(t0);
    let release_time = t0 + this.releaseTime;
    gain.linearRampToValueAtTime(0, release_time);
    this.keyOffTime = t0;
    this.keyOnTime = 0;
    this.keyOn = false;
    return release_time;
  }
};

export class Voice {
  constructor(audioctx) {
    this.audioctx = audioctx;
    this.sample = waveSamples[6];
    this.volume = audioctx.createGain();
    this.envelope = new EnvelopeGenerator(this,
      0.5,
      0.25,
      0.8,
      2.5
    );
    this.initProcessor();
    this.detune = 1.0;
    this.volume.gain.value = 1.0;
    this.output = this.volume;
  }

  initProcessor() {
    // if(this.processor){
    //   this.stop();
    //   this.processor.disconnect();
    //   this.processor = null;
    // }
    let processor = this.processor = this.audioctx.createBufferSource();
    let gain = this.gain = this.audioctx.createGain();
    gain.gain.value = 0.0;

    this.processor.buffer = this.sample.sample;
    this.processor.loop = this.sample.loop;
    this.processor.loopStart = 0;
    this.processor.playbackRate.value = 1.0;
    this.processor.loopEnd = this.sample.end;
    this.processor.connect(this.gain);
    this.processor.onended = () => {
      processor.disconnect();
      gain.disconnect();
    };
    gain.connect(this.volume);
  }

  // setSample (sample) {
  //     this.envelope.keyoff(0);
  //     this.processor.disconnect(this.gain);
  //     this.sample = sample;
  //     this.initProcessor();
  //     this.processor.start();
  // }

  start(startTime) {
    //   this.processor.disconnect(this.gain);
    this.initProcessor();
    this.processor.start(startTime);
  }

  stop(time) {
    this.processor.stop(time);
    //this.reset();
  }

  keyon(t, note, vel) {
    this.start(t);
    this.processor.playbackRate.setValueAtTime(noteFreq[note] * this.detune, t);
    this.keyOnTime = t;
    this.envelope.keyon(t, vel);
  }

  keyoff(t) {
    this.gain.gain.cancelScheduledValues(t/*this.keyOnTime*/);
    this.keyOffTime = this.envelope.keyoff(t);
    this.processor.stop(this.keyOffTime);
  }

  isKeyOn(t) {
    return this.envelope.keyOn && (this.keyOnTime <= t);
  }

  isKeyOff(t) {
    return !this.envelope.keyOn && (this.keyOffTime <= t);
  }

  reset() {
    this.processor.playbackRate.cancelScheduledValues(0);
    this.gain.gain.cancelScheduledValues(0);
    this.gain.gain.value = 0;
  }
}

/// ボイス
export class OscVoice {
  constructor(audioctx, periodicWave) {
    this.audioctx = audioctx;
    this.sample = periodicWave;
    this.volume = audioctx.createGain();
    this.envelope = new EnvelopeGenerator(this,
      0.5,
      0.25,
      0.8,
      2.5
    );
    this.initProcessor();
    this.detune = 1.0;
    this.volume.gain.value = 1.0;
    this.output = this.volume;
  }

  initProcessor() {
    let processor = this.processor = this.audioctx.createOscillator();
    let gain = this.gain = this.audioctx.createGain();
    this.gain.gain.value = 0.0;
    this.processor.setPeriodicWave(this.sample);
    this.processor.connect(this.gain);
    this.processor.onended = () => {
      processor.disconnect();
      gain.disconnect();
    };
    this.gain.connect(this.volume);
  }

  start(startTime) {
    this.initProcessor();
    this.processor.start(startTime);
  }

  stop(time) {
    this.processor.stop(time);
  }

  keyon(t, note, vel) {
    this.start(t);
    this.processor.frequency.setValueAtTime(midiFreq[note] * this.detune, t);
    this.keyOnTime = t;
    this.envelope.keyon(t, vel);
  }

  keyoff(t) {
    this.gain.gain.cancelScheduledValues(t/*this.keyOnTime*/);
    this.keyOffTime = this.envelope.keyoff(t);
    this.processor.stop(this.keyOffTime);
  }

  isKeyOn(t) {
    return this.envelope.keyOn && (this.keyOnTime <= t);
  }

  isKeyOff(t) {
    return !this.envelope.keyOn && (this.keyOffTime <= t);
  }

  reset() {
    this.processor.playbackRate.cancelScheduledValues(0);
    this.gain.gain.cancelScheduledValues(0);
    this.gain.gain.value = 0;
  }
}

export class Audio {
  constructor() {
    this.VOICES = 16;
    this.enable = false;
    this.audioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;

    if (this.audioContext) {
      this.audioctx = new this.audioContext();
      this.enable = true;
    }

    this.voices = [];
    if (this.enable) {
      createWaveSampleFromWaves(this.audioctx, BUFFER_SIZE);
      //this.periodicWaves = createPeriodicWaveFromWaves(this.audioctx);
      this.filter = this.audioctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 20000;
      this.filter.Q.value = 0.0001;
      this.noiseFilter = this.audioctx.createBiquadFilter();
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.value = 1000;
      this.noiseFilter.Q.value = 1.8;
      this.comp = this.audioctx.createDynamicsCompressor();
      this.filter.connect(this.comp);
      this.noiseFilter.connect(this.comp);
      this.comp.connect(this.audioctx.destination);
      // this.filter.connect(this.audioctx.destination);
      // this.noiseFilter.connect(this.audioctx.destination);
      for (var i = 0, end = this.VOICES; i < end; ++i) {
        //var v = new OscVoice(this.audioctx,this.periodicWaves[0]);
        var v = new Voice(this.audioctx);
        this.voices.push(v);
        if (i == (this.VOICES - 1)) {
          v.output.connect(this.noiseFilter);
        } else {
          v.output.connect(this.filter);
        }
      }
      this.readDrumSample = readDrumSample(this.audioctx);
      //  this.started = false;
      //this.voices[0].output.connect();
    }
  }

  start() {
    // var voices = this.voices;
    // for (var i = 0, end = voices.length; i < end; ++i)
    // {
    //   voices[i].start(0);
    // }
  }

  stop() {
    //if(this.started)
    //{
    var voices = this.voices;
    for (var i = 0, end = voices.length; i < end; ++i) {
      voices[i].stop(0);
    }
    //  this.started = false;
    //}
  }
  
  getWaveSample(no){
    return waveSamples[no];
  }
}



/**********************************************/
/* シーケンサーコマンド                       */
/**********************************************/

function calcStep(noteLength) {
  // 長さからステップを計算する
  let prev = null;
  let dotted = 0;

  let map = noteLength.map((elem) => {
    switch (elem) {
      case null:
        elem = prev;
        break;
      case 0:
        elem = (dotted *= 2);
        break;
      default:
        prev = dotted = elem;
        break;
    }

    let length = elem !== null ? elem : DefaultParams.length;

    return TIME_BASE * (4 / length);
  });
  return map.reduce((a, b) => a + b, 0);
}

export class Note {
  constructor(notes, length) {

    this.notes = notes;
    if (length[0]) {
      this.step = calcStep(length);
    }
  }

  process(track) {
    this.notes.forEach((n, i) => {
      var back = track.back;
      var note = n;
      var oct = this.oct || back.oct;
      var step = this.step || back.step;
      var gate = this.gate || back.gate;
      var vel = this.vel || back.vel;
      setQueue(track, note, oct, i == 0 ? step : 0, gate, vel);
    });
  }
}

class SeqData {
  constructor(note, oct, step, gate, vel) {
    this.note = note;
    this.oct = oct;
    //this.no = note.no + oct * 12;
    this.step = step;
    this.gate = gate;
    this.vel = vel;
    this.sample = wave
  }

  process(track) {
    var back = track.back;
    var note = this.note || back.note;
    var oct = this.oct || back.oct;
    var step = this.step || back.step;
    var gate = this.gate || back.gate;
    var vel = this.vel || back.vel;
    setQueue(track, note, oct, step, gate, vel);
  }
}

function setQueue(track, note, oct, step, gate, vel) {
  let no = note + oct * 12;
  let back = track.back;
  var step_time = (step ? track.playingTime : back.playingTime);
  // var gate_time = ((gate >= 0) ? gate * 60 : step * gate * 60 * -1.0) / (TIME_BASE * track.localTempo) + track.playingTime;

  var gate_time = ((step == 0 ? back.codeStep : step) * gate * 60) / (TIME_BASE * track.localTempo) + (step ? track.playingTime : back.playingTime);
  //let voice = track.audio.voices[track.channel];
  let voice = track.assignVoice(step_time);
  //voice.reset();
  voice.sample = back.sample;
  voice.envelope.attackTime = back.attack;
  voice.envelope.decayTime = back.decay;
  voice.envelope.sustainLevel = back.sustain;
  voice.envelope.releaseTime = back.release;
  voice.detune = back.detune;
  voice.volume.gain.setValueAtTime(back.volume, step_time);

  //voice.initProcessor();

  //console.log(track.sequencer.tempo);
  voice.keyon(step_time, no, vel);
  voice.keyoff(gate_time);
  if (step) {
    back.codeStep = step;
    back.playingTime = track.playingTime;
  }

  track.playingTime = (step * 60) / (TIME_BASE * track.localTempo) + track.playingTime;
  // back.voice = voice;
  // back.note = note;
  // back.oct = oct;
  // back.gate = gate;
  // back.vel = vel;
}


function S(note, oct, step, gate, vel) {
  var args = Array.prototype.slice.call(arguments);
  if (S.length != args.length) {
    if (typeof (args[args.length - 1]) == 'object' && !(args[args.length - 1] instanceof Note)) {
      var args1 = args[args.length - 1];
      var l = args.length - 1;
      return new SeqData(
        ((l != 0) ? note : false) || args1.note || args1.n || null,
        ((l != 1) ? oct : false) || args1.oct || args1.o || null,
        ((l != 2) ? step : false) || args1.step || args1.s || null,
        ((l != 3) ? gate : false) || args1.gate || args1.g || null,
        ((l != 4) ? vel : false) || args1.vel || args1.v || null
      );
    }
  }
  return new SeqData(note || null, oct || null, step || null, gate || null, vel || null);
}

function S1(note, oct, step, gate, vel) {
  return S(note, oct, l(step), gate, vel);
}

function S2(note, len, dot, oct, gate, vel) {
  return S(note, oct, l(len, dot), gate, vel);
}

function S3(note, step, gate, vel, oct) {
  return S(note, oct, step, gate, vel);
}


/// 音符の長さ指定

class Length {
  constructor(len) {
    this.step = calcStep(len);
  }
  process(track) {
    track.back.step = this.step;
  }
}

class Step {
  constructor(step) {
    this.step = step;
  }
  process(track) {
    track.back.step = this.step;
  }
}

/// ゲートタイム指定

class GateTime {
  constructor(gate) {
    this.gate = gate / 100;
  }

  process(track) {
    track.back.gate = this.gate;
  }
}

/// ベロシティ指定

class Velocity {
  constructor(vel) {
    this.vel = vel / 100;
  }
  process(track) {
    track.back.vel = this.vel;
  }
}

/// 音色設定
class Tone {
  constructor(no) {
    this.no = no;
    //this.sample = waveSamples[this.no];
  }

  process(track) {
    //    track.back.sample = track.audio.periodicWaves[this.no];
    track.back.sample = waveSamples[this.no];
    //    track.audio.voices[track.channel].setSample(waveSamples[this.no]);
  }
}

class Rest {
  constructor(length) {
    if(length[0]){
      this.step = calcStep(length);
    }
  }
  process(track) {
    const step = this.step || track.back.step;
    track.playingTime = track.playingTime + (step * 60) / (TIME_BASE * track.localTempo);
    //track.back.step = this.step;
  }
}

class Octave {
  constructor(oct) {
    this.oct = oct;
  }
  process(track) {
    track.back.oct = this.oct;
  }
}


class OctaveUp {
  constructor(v) { this.v = v; }
  process(track) {
    track.back.oct += this.v;
  }
}

class OctaveDown {
  constructor(v) { this.v = v; }
  process(track) {
    track.back.oct -= this.v;
  }
}
class Tempo {
  constructor(tempo) {
    this.tempo = tempo;
  }

  process(track) {
    track.localTempo = this.tempo;
    //track.sequencer.tempo = this.tempo;
  }
}

class Envelope {
  constructor(attack, decay, sustain, release) {
    this.attack = attack;
    this.decay = decay;
    this.sustain = sustain;
    this.release = release;
  }

  process(track) {
    //var envelope = track.audio.voices[track.channel].envelope;
    track.back.attack = this.attack;
    track.back.decay = this.decay;
    track.back.sustain = this.sustain;
    track.back.release = this.release;
  }
}

/// デチューン
class Detune {
  constructor(detune) {
    this.detune = detune;
  }

  process(track) {
    //var voice = track.audio.voices[track.channel];
    track.back.detune = this.detune;
  }
}

class Volume {
  constructor(volume) {
    this.volume = volume / 100.0;
  }

  process(track) {
    // 
    track.back.volume = this.volume;
    // track.audio.voices[track.channel].volume.gain.setValueAtTime(this.volume, track.playingTime);
  }
}

class LoopData {
  constructor(obj, varname, count, seqPos) {
    this.varname = varname;
    this.count = count || DefaultParams.loopCount;
    this.obj = obj;
    this.seqPos = seqPos;
    this.outSeqPos = -1;
  }

  process(track) {
    var stack = track.stack;
    if (stack.length == 0 || stack[stack.length - 1].obj !== this) {
      var ld = this;
      stack.push(new LoopData(this, ld.varname, ld.count, track.seqPos));
    }
  }
}

class LoopEnd {
  constructor(seqPos) {
    this.seqPos = seqPos;
  }
  process(track) {
    var ld = track.stack[track.stack.length - 1];
    if (ld.outSeqPos == -1) ld.outSeqPos = this.seqPos;
    ld.count--;
    if (ld.count > 0) {
      track.seqPos = ld.seqPos;
    } else {
      track.stack.pop();
    }
  }
}

class LoopExit {
  process(track) {
    var ld = track.stack[track.stack.length - 1];
    if (ld.count <= 1 && ld.outSeqPos != -1) {
      track.seqPos = ld.outSeqPos;
      track.stack.pop();
    }
  }
}

class InfiniteLoop {
  process(track) {
    track.infinitLoopIndex = track.seqPos;
  }
}
/////////////////////////////////
/// シーケンサートラック
class Track {
  constructor(sequencer, seqdata, audio) {
    this.name = '';
    this.end = false;
    this.oneshot = false;
    this.sequencer = sequencer;
    this.seqData = seqdata;
    this.seqPos = 0;
    this.mute = false;
    this.playingTime = -1;
    this.localTempo = sequencer.tempo;
    this.trackVolume = 1.0;
    this.transpose = 0;
    this.solo = false;
    this.channel = -1;
    this.track = -1;
    this.audio = audio;
    this.infinitLoopIndex = -1;
    this.back = {
      note: 72,
      oct: 5,
      step: 96,
      gate: 0.5,
      vel: 1.0,
      attack: 0.01,
      decay: 0.05,
      sustain: 0.6,
      release: 0.07,
      detune: 1.0,
      volume: 0.5,
      //      sample:audio.periodicWaves[0]
      sample: waveSamples[0]
    }
    this.stack = [];
  }

  process(currentTime) {

    if (this.end) return;

    if (this.oneshot) {
      this.reset();
    }

    var seqSize = this.seqData.length;
    if (this.seqPos >= seqSize) {
      if (this.sequencer.repeat) {
        this.seqPos = 0;
      } else if (this.infinitLoopIndex >= 0) {
        this.seqPos = this.infinitLoopIndex;
      } else {
        this.end = true;
        return;
      }
    }

    var seq = this.seqData;
    this.playingTime = (this.playingTime > -1) ? this.playingTime : currentTime;
    var endTime = currentTime + 0.2/*sec*/;

    while (this.seqPos < seqSize) {
      if (this.playingTime >= endTime && !this.oneshot) {
        break;
      } else {
        var d = seq[this.seqPos];
        d.process(this);
        this.seqPos++;
      }
    }
  }

  reset() {
    // var curVoice = this.audio.voices[this.channel];
    // curVoice.gain.gain.cancelScheduledValues(0);
    // curVoice.processor.playbackRate.cancelScheduledValues(0);
    // curVoice.gain.gain.value = 0;
    this.playingTime = -1;
    this.seqPos = 0;
    this.infinitLoopIndex = -1;
    this.end = false;
    this.stack.length = 0;
  }

  assignVoice(t) {
    let ret = null;
    this.audio.voices.some((d, i) => {
      if (d.isKeyOff(t)) {
        ret = d;
        return true;
      }
      return false;
    });
    if (!ret) {
      let oldestKeyOnData = (this.audio.voices.map((d, i) => {
        return { time: d.envelope.keyOnTime, d, i };
      }).sort((a, b) => a.time - b.time))[0];
      ret = oldestKeyOnData.d;
    }
    return ret;
  }

}

function loadTracks(self, tracks, trackdata) {
  for (var i = 0; i < trackdata.length; ++i) {
    var track = new Track(self, trackdata[i].data, self.audio);
    track.channel = trackdata[i].channel;
    track.oneshot = (!trackdata[i].oneshot) ? false : true;
    track.track = i;
    tracks.push(track);
  }
  return tracks;
}

function createTracks(trackdata) {
  var tracks = [];
  loadTracks(this, tracks, trackdata.tracks);
  return tracks;
}

////////////////////////////
/// シーケンサー本体 
export class Sequencer {
  constructor(audio) {
    this.STOP = 0 | 0;
    this.PLAY = 1 | 0;
    this.PAUSE = 2 | 0;

    this.audio = audio;
    this.tempo = 100.0;
    this.repeat = false;
    this.play = false;
    this.tracks = [];
    this.pauseTime = 0;
    this.status = this.STOP;
  }
  load(data) {
    parseMML(data);
    if (this.play) {
      this.stop();
    }
    this.tracks.length = 0;
    loadTracks(this, this.tracks, data.tracks);
  }
  start() {
    //    this.handle = window.setTimeout(function () { self.process() }, 50);
    this.audio.readDrumSample
      .then(() => {
        this.status = this.PLAY;
        this.process();
      });
  }
  process() {
    if (this.status == this.PLAY) {
      this.playTracks(this.tracks);
      this.handle = window.setTimeout(this.process.bind(this), 100);
    }
  }
  playTracks(tracks) {
    var currentTime = this.audio.audioctx.currentTime;
    //   console.log(this.audio.audioctx.currentTime);
    for (var i = 0, end = tracks.length; i < end; ++i) {
      tracks[i].process(currentTime);
    }
  }
  pause() {
    this.status = this.PAUSE;
    this.pauseTime = this.audio.audioctx.currentTime;
  }
  resume() {
    if (this.status == this.PAUSE) {
      this.status = this.PLAY;
      var tracks = this.tracks;
      var adjust = this.audio.audioctx.currentTime - this.pauseTime;
      for (var i = 0, end = tracks.length; i < end; ++i) {
        tracks[i].playingTime += adjust;
      }
      this.process();
    }
  }
  stop() {
    if (this.status != this.STOP) {
      clearTimeout(this.handle);
      //    clearInterval(this.handle);
      this.status = this.STOP;
      this.reset();
    }
  }
  reset() {
    for (var i = 0, end = this.tracks.length; i < end; ++i) {
      this.tracks[i].reset();
    }
  }
}

function parseMML(data) {
  data.tracks.forEach((d) => {
    d.data = parseMML_(d.mml);
  });
}

function parseMML_(mml) {
  let parser = new MMLParser(mml);
  let commands = parser.parse();
  let seqArray = [];
  commands.forEach((command) => {
    switch (command.type) {
      case Syntax.Note:
        seqArray.push(new Note(command.noteNumbers, command.noteLength));
        break;
      case Syntax.Rest:
        seqArray.push(new Rest(command.noteLength));
        break;
      case Syntax.Octave:
        seqArray.push(new Octave(command.value));
        break;
      case Syntax.OctaveShift:
        if (command.direction >= 0) {
          seqArray.push(new OctaveUp(1));
        } else {
          seqArray.push(new OctaveDown(1));
        }
        break;
      case Syntax.NoteLength:
        seqArray.push(new Length(command.noteLength));
        break;
      case Syntax.NoteVelocity:
        seqArray.push(new Velocity(command.value));
        break;
      case Syntax.Tempo:
        seqArray.push(new Tempo(command.value));
        break;
      case Syntax.NoteQuantize:
        seqArray.push(new GateTime(command.value));
        break;
      case Syntax.InfiniteLoop:
        seqArray.push(new InfiniteLoop());
        break;
      case Syntax.LoopBegin:
        seqArray.push(new LoopData(null, '', command.value, null));
        break;
      case Syntax.LoopExit:
        seqArray.push(new LoopExit());
        break;
      case Syntax.LoopEnd:
        seqArray.push(new LoopEnd());
        break;
      case Syntax.Tone:
        seqArray.push(new Tone(command.value));
      case Syntax.WaveForm:
        break;
      case Syntax.Envelope:
        seqArray.push(new Envelope(command.a, command.d, command.s, command.r));
        break;
    }
  });
  return seqArray;
}
export class SoundEffects {
  constructor(sequencer,data){
    this.soundEffects = [];
    data.forEach((d)=>{
      var tracks = [];
      parseMML(d);
      this.soundEffects.push(loadTracks(sequencer, tracks, d.tracks));
    });
  }
}





