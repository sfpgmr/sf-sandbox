(function () {
  'use strict';

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


  // エンディアンを調べる関数
  function checkEndian(buffer = new ArrayBuffer(2)) {

    if (buffer.byteLength == 1) return false;

    const ua = new Uint16Array(buffer);
    const v = new DataView(buffer);
    v.setUint16(0, 1);
    // ArrayBufferとDataViewの読み出し結果が異なればリトル・エンディアンである
    if (ua[0] != v.getUint16()) {
      ua[0] = 0;
      return true;
    }
    ua[0] = 0;
    // ビッグ・エンディアン
    return false;
  }

  const littleEndian = checkEndian();

  // ブラウザのチェック
  function checkBrowser() {
    let userAgent = window.navigator.userAgent.toLowerCase();
    let currentBrowser = '';

    if (userAgent.indexOf('msie') != -1 ||
      userAgent.indexOf('trident') != -1) {
      currentBrowser = 'trident';
    } else if (userAgent.indexOf('edge') != -1) {
      currentBrowser = 'edge';
    } else if (userAgent.indexOf('chrome') != -1) {
      currentBrowser = 'chrome';
    } else if (userAgent.indexOf('safari') != -1) {
      currentBrowser = 'safari';
    } else if (userAgent.indexOf('firefox') != -1) {
      currentBrowser = 'firefox';
    } else if (userAgent.indexOf('opera') != -1) {
      currentBrowser = 'opera';
    } else {
      currentBrowser = 'unknown';
    }
    return currentBrowser;
  }

  let browser = checkBrowser();

  if (browser !== 'chrome') {
    alert('このページで使用する機能をサポートしていません。');
  }

  function getOffset(prop) {
    return prop._attributes_.offset;
  }

  function disableInputs(disabled = true) {
    let d = disabled ? 'disabled' : '';
    let inputs = document.querySelectorAll('input');
    for (const i of inputs) {
      i.disabled = d;
    }
    inputs = document.querySelectorAll('textarea');
    for (const i of inputs) {
      i.disabled = d;
    }
    inputs = document.querySelectorAll('select');
    for (const i of inputs) {
      i.disabled = d;
    }

  }

  let psg, psgBin, memoryMap, psgWorker, audioctx, wasmModule, wasmFuncs, timbre;
  let play = false;
  let vol;
  let sharedMemory, sharedMemoryView;

  window.addEventListener('load', async () => {

    const startButton = document.getElementById('start');

    disableInputs(true);

    window.addEventListener("unload", () => {
      if (psgWorker) {
        psgWorker.terminate();
      }
      if (audioctx) {
        audioctx.close();
      }
    });

    // Wave Table エディタ
    let waveTableSize = 32;
    const canvasWidth = 512, canvasHeight = 256;
    let pixelWidth = (512 / waveTableSize) | 0;
    let isDrawing = false, drawPosition = { x: 0, y: 0 };

    const waveTableLength = document.getElementById('wavetable-length');
    waveTableLength.addEventListener('change', (e) => {
      waveTableSize = e.target.value;
      setWaveTableSize(waveTableSize);
      pixelWidth = (canvasWidth / waveTableSize) | 0;
    });

    function setWaveTableSize(size, oscillatorNo = 0) {
      const wavetable_offset = sharedMemoryView.getInt32(getOffset(memoryMap.oscillator) + oscillatorNo * 4, littleEndian);
      const wavetable_work_offset = timbre + getOffset(memoryMap.TimbreWork.oscillator_work_offset);
      wasmFuncs.setWaveTableSize(wavetable_offset, size);
      wasmFuncs.initWaveTableWork(wavetable_work_offset, wavetable_offset, 440);
    }

    const waveTableCanvas = document.getElementById("WPSG-Wave-Table"),
      context = waveTableCanvas.getContext("2d");


    function calcPos(e) {
      const rect = waveTableCanvas.getBoundingClientRect();
      drawPosition.x = (((e.clientX - rect.left) / pixelWidth) | 0) * pixelWidth;
      drawPosition.y = (e.clientY - rect.top) | 0;
    }

    waveTableCanvas.addEventListener('mousedown', e => {
      calcPos(e);
      isDrawing = play;
    });

    waveTableCanvas.addEventListener('mousemove', e => {
      if (isDrawing === true) {
        let sx = drawPosition.x;
        let sy = drawPosition.y;
        let halfHeight = canvasHeight / 2;
        calcPos(e);

        // x
        let ex = drawPosition.x;
        let w = (Math.abs(ex - sx) + pixelWidth) | 0;
        if (ex < sx) {
          sx = ex;
        }

        for (let i = 0; i < w; i += pixelWidth) {
          setValueToMemory(sx + i, sy);
        }

        // y
        let wy;
        if (sy < halfHeight) {
          wy = halfHeight - sy;
        } else {
          wy = sy - halfHeight;
          sy = halfHeight;
        }

        context.fillStyle = 'black';
        context.fillRect(sx, 0, w, 256);

        context.fillStyle = 'red';
        context.fillRect(sx, sy, w, wy);
      }
    });

    window.addEventListener('mouseup', e => {
      if (isDrawing === true) {
        isDrawing = false;
      }
    });

    waveTableCanvas
      .addEventListener("click", (e) => {
        context.fillStyle = 'red';
        const rect = waveTableCanvas.getBoundingClientRect();
        context.fillRect(e.clientX - rect.left, e.clientY - rect.top, 1, 1);
        e.preventDefault = true;
      }, false);

    const formulaInfo = document.getElementById('result-fomula');
    formulaInfo.style.display = 'none';

    function showFormulaInfo(display, message) {
      if (display) {
        formulaInfo.style.display = '';
        formulaInfo.innerText = message;
      } else {
        formulaInfo.style.display = 'none';
      }
    }


    const formula = document.getElementById('formula');
    const applyFormula = document.getElementById('apply-formula');

    applyFormula.addEventListener('click', function (e) {
      showFormulaInfo(false);
      // 簡易チェック
      if (formula.value.match(/(alert)|(console)/)) {
        showFormulaInfo(true, 'error:console,alertは使用できません。');
        e.preventDefault = true;
        return false;
      }
      drawFormula(formula.value);
    });

    function drawFormula(code) {
      let f = new Function('t', 'return ' + code);
      for (let x = 0, i = 0, ei = waveTableSize; i < ei; ++i, x += pixelWidth) {
        let t = i / waveTableSize * 2 - 1;
        let y = f(t);
        if (y > 1.0) y = 1.0;
        if (y < -1.0) y = -1.0;


        let halfHeight = canvasHeight / 2;
        y = halfHeight - (y * halfHeight);
        setValueToMemory(x, y);
        let wy;
        if (y < halfHeight) {
          wy = halfHeight - y;
        } else {
          wy = y - halfHeight;
          y = halfHeight;
        }

        context.fillStyle = 'black';
        context.fillRect(x, 0, pixelWidth, 256);

        context.fillStyle = 'red';
        context.fillRect(x, y, pixelWidth, wy);

      }
    }


    function drawMemory(oscillatorNo = 0) {
      const wavedata_offset = sharedMemoryView.getInt32(getOffset(memoryMap.oscillator) + oscillatorNo * 4, littleEndian) + getOffset(memoryMap.WaveTable.wave_data_start);

      for (let i = 0, x = 0, xdelta = canvasWidth / waveTableSize; i < waveTableSize; ++i, x += xdelta) {
        const halfHeight = canvasHeight / 2;
        let y = halfHeight - halfHeight * sharedMemoryView.getFloat32(wavedata_offset + i * 4, littleEndian);

        context.fillStyle = 'black';
        context.fillRect(x, 0, pixelWidth, 256);

        let wy;
        if (y < halfHeight) {
          wy = halfHeight - y;
        } else {
          wy = y - halfHeight;
          y = halfHeight;
        }

        context.fillStyle = 'red';
        context.fillRect(x, y, pixelWidth, wy);

      }

    }

    const redraw = document.getElementById('redraw');
    redraw.addEventListener('click',
      (e) => {
        drawMemory();
      }
    );

    function setValueToMemory(x, y, oscillatorNo = 0) {
      const wavedata_offset =
        sharedMemoryView.getInt32(getOffset(memoryMap.oscillator) + oscillatorNo * 4, littleEndian) + getOffset(memoryMap.WaveTable.wave_data_start)
        + ((x / pixelWidth) | 0) * 4;
      const halfHeight = canvasHeight / 2;
      y = Math.max(Math.min(((halfHeight - y) / halfHeight), 1.0), -1.0);
      sharedMemoryView.setFloat32(wavedata_offset, y, littleEndian);
    }

    const waveTableGrid = document.getElementById('WaveTableGrid');
    const timbreGrid = document.getElementById('TimbreGrid');
    const waveTableTab = document.getElementById('WaveTableTab');
    const timbreTab = document.getElementById('TimbreTab');

    timbreGrid.style.display = 'none';

    waveTableTab.addEventListener('click', (e) => {

      timbreTab.classList.remove('siimple-tabs-item--selected');
      timbreGrid.style.display = 'none';

      waveTableGrid.style.display = '';
      waveTableTab.classList.add('siimple-tabs-item--selected');
    });

    timbreTab.addEventListener('click', (e) => {
      timbreTab.classList.add('siimple-tabs-item--selected');
      timbreGrid.style.display = '';

      waveTableGrid.style.display = 'none';
      waveTableTab.classList.remove('siimple-tabs-item--selected');
    });

    // Amplitude Parameter

    const ampEnvelope = document.getElementById('amplitude-envelope-sw');
    const ampEGAttack = document.getElementById('amplitude-attack');
    const ampEGDecay = document.getElementById('amplitude-decay');
    const ampEGSustain = document.getElementById('amplitude-sustain');
    const ampEGRelease = document.getElementById('amplitude-release');
    const ampEGLevel = document.getElementById('amplitude-level');

    const ampEGAttackText = document.getElementById('amplitude-attack-text');
    const ampEGDecayText = document.getElementById('amplitude-decay-text');
    const ampEGSustainText = document.getElementById('amplitude-sustain-text');
    const ampEGReleaseText = document.getElementById('amplitude-release-text');
    const ampEGLevelText = document.getElementById('amplitude-level-text');

    const ampLFO = document.getElementById('amplitude-lfo-sw');
    const ampLFOPitch = document.getElementById('amplitude-lfo-pitch');
    const ampLFOPitchText = document.getElementById('amplitude-lfo-pitch-text');
    const ampLFOLevel = document.getElementById('amplitude-lfo-level');
    const ampLFOLevelText = document.getElementById('amplitude-lfo-level-text');
   
    function getTimbreFlagInfo(){
      let timbreOffset = sharedMemoryView.getUint32(timbre + getOffset(memoryMap.TimbreWork.timbre_offset),littleEndian);
      let timbreFlagOffset = timbreOffset + getOffset(memoryMap.Timbre.flag);
      return  {
        offset:timbreFlagOffset, 
        value:sharedMemoryView.getUint32(timbreFlagOffset,littleEndian)
      };
    }

    function setTimbreFlagInfo(timbreFlagInfo){
      sharedMemoryView.setUint32(timbreFlagInfo.offset,timbreFlagInfo.value,littleEndian);
    }

    function updateEnvelopeParam(value,inputText,envelopeName,propName){
      inputText.value = value;
      let envParamOffset = timbre + getOffset(memoryMap.TimbreWork[envelopeName].env_param_offset);
      let envelopeOffset = sharedMemoryView.getUint32(envParamOffset,littleEndian);
      let offset = envelopeOffset + getOffset(memoryMap.Envelope[propName]);
      sharedMemoryView.setFloat32(offset,value,littleEndian);
      wasmFuncs.updateEnvelope(envelopeOffset);
    }

    function updateTimbreFlagInfo(condition,value){
      const timbreFlagInfo = getTimbreFlagInfo();
      if(condition){
        timbreFlagInfo.value |= value;
      } else {
        timbreFlagInfo.value &= (0xffffffff ^ value);
      }
      setTimbreFlagInfo(timbreFlagInfo);
    }

    function updateLFOParam(value,inputText,lfoWorkOffsetName,lfoPropName){
      inputText.value = value;
      let lfoWorkOffset = timbre + getOffset(memoryMap.TimbreWork[lfoWorkOffsetName]);
      let offset = getOffset(memoryMap.OscillatorWork[lfoPropName]) + lfoWorkOffset;
      sharedMemoryView.setFloat32(offset,value,littleEndian);
    }

    ampEnvelope.addEventListener('click',(e)=>{
      updateTimbreFlagInfo(e.srcElement.checked,0x4);
    });

    ampEGAttack.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,ampEGAttackText,'amplitude_envelope','attack_time');
    });

    ampEGDecay.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,ampEGDecayText,'amplitude_envelope','decay_time');
    });

    ampEGSustain.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,ampEGSustainText,'amplitude_envelope','sustain_level');
    });

    ampEGRelease.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,ampEGReleaseText,'amplitude_envelope','release_time');
    });

    ampEGLevel.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,ampEGLevelText,'amplitude_envelope','level');
    });

    ampLFO.addEventListener('click',(e)=>{
      updateTimbreFlagInfo(e.srcElement.checked,0x8);
    });

    ampLFOPitch.addEventListener('input',(e)=>{
      updateLFOParam(e.srcElement.value,ampLFOPitchText,'amplitude_lfo_work_offset','pitch');
    });
    
    ampLFOLevel.addEventListener('input',(e)=>{
      updateLFOParam(e.srcElement.value,ampLFOLevelText,'amplitude_lfo_work_offset','level');
    });

    // Filter Parameter
    const filterEnable = document.getElementById('filter-sw');
    const filterType = document.getElementById('filter-type');
    const filterQ = document.getElementById('filter-q');
    const filterQText = document.getElementById('filter-q-text');
    const filterFrequency = document.getElementById('filter-frequency');
    const filterFrequencyText = document.getElementById('filter-frequency-text');
    const filterBandwidth = document.getElementById('filter-bandwidth');
    const filterBandwidthText = document.getElementById('filter-bandwidth-text');
    const filterGain = document.getElementById('filter-gain');
    const filterGainText = document.getElementById('filter-gain-text');

    const filterEnvelope = document.getElementById('filter-envelope-sw');
    const filterEGAttack = document.getElementById('filter-attack');
    const filterEGDecay = document.getElementById('filter-decay');
    const filterEGSustain = document.getElementById('filter-sustain');
    const filterEGRelease = document.getElementById('filter-release');
    const filterEGLevel = document.getElementById('filter-level');

    const filterEGAttackText = document.getElementById('filter-attack-text');
    const filterEGDecayText = document.getElementById('filter-decay-text');
    const filterEGSustainText = document.getElementById('filter-sustain-text');
    const filterEGReleaseText = document.getElementById('filter-release-text');
    const filterEGLevelText = document.getElementById('filter-level-text');

    const filterLFO = document.getElementById('filter-lfo-sw');
    const filterLFOPitch = document.getElementById('filter-lfo-pitch');
    const filterLFOPitchText = document.getElementById('filter-lfo-pitch-text');
    const filterLFOLevel = document.getElementById('filter-lfo-level');
    const filterLFOLevelText = document.getElementById('filter-lfo-level-text');

    function updateFilterValue(value,inputText,propName){
      inputText.value = value;
      const filterWorkOffset = timbre + getOffset(memoryMap.TimbreWork.filter);
      const filterOffset = sharedMemoryView.getUint32(filterWorkOffset,littleEndian);
      const filterQOffset = filterOffset + getOffset(memoryMap.Filter[propName]);
      sharedMemoryView.setFloat32(filterQOffset,value,littleEndian);
    }


    filterEnable.addEventListener('change',(e)=>{
      updateTimbreFlagInfo(e.srcElement.checked,0x10);
    });

    filterType.addEventListener('change',(e)=>{
      const filterType = e.srcElement.value;
      const filterWorkOffset = timbre + getOffset(memoryMap.TimbreWork.filter);
      const filterOffset = sharedMemoryView.getUint32(filterWorkOffset,littleEndian);
      wasmFuncs.initFilter(filterOffset,filterType,filterFrequency.value,filterQ.value,filterBandwidth.value,filterGain.value);
      wasmFuncs.initFilterWork(filterOffset,filterWorkOffset);
      // フィルタのタイプに応じてコントロールを有効化・無効化する必要あり
    });

    filterQ.addEventListener('input',(e)=>{
      updateFilterValue(e.srcElement.value,filterQText,'q');
    });

    filterFrequency.addEventListener('input',(e)=>{
      updateFilterValue(e.srcElement.value,filterFrequencyText,'base_frequency');
    });

    filterBandwidth.addEventListener('input',(e)=>{
      updateFilterValue(e.srcElement.value,filterBandwidthText,'band_width');
    });

    filterGain.addEventListener('input',(e)=>{
      updateFilterValue(e.srcElement.value,filterGainText,'gain');
    });

    filterEnvelope.addEventListener('click',(e)=>{
      updateTimbreFlagInfo(e.srcElement.checked,0x20);
    });

    filterEGAttack.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,filterEGAttackText,'filter_envelope','attack_time');
    });

    filterEGDecay.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,filterEGDecayText,'filter_envelope','decay_time');
    });

    filterEGSustain.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,filterEGSustainText,'filter_envelope','sustain_level');
    });

    filterEGRelease.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,filterEGReleaseText,'filter_envelope','release_time');
    });

    filterEGLevel.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,filterEGLevelText,'filter_envelope','level');
    });

    filterLFO.addEventListener('click',(e)=>{
      updateTimbreFlagInfo(e.srcElement.checked,0x40);
    });

    filterLFOPitch.addEventListener('input',(e)=>{
      updateLFOParam(e.srcElement.value,filterLFOPitchText,'filter_lfo_work_offset','pitch');
    });
    
    filterLFOLevel.addEventListener('input',(e)=>{
      updateLFOParam(e.srcElement.value,filterLFOLevelText,'filter_lfo_work_offset','level');
    });


    // pitch

    const pitchEnvelope = document.getElementById('pitch-envelope-sw');
    const pitchEGAttack = document.getElementById('pitch-attack');
    const pitchEGDecay = document.getElementById('pitch-decay');
    const pitchEGSustain = document.getElementById('pitch-sustain');
    const pitchEGRelease = document.getElementById('pitch-release');
    const pitchEGLevel = document.getElementById('pitch-level');

    const pitchEGAttackText = document.getElementById('pitch-attack-text');
    const pitchEGDecayText = document.getElementById('pitch-decay-text');
    const pitchEGSustainText = document.getElementById('pitch-sustain-text');
    const pitchEGReleaseText = document.getElementById('pitch-release-text');
    const pitchEGLevelText = document.getElementById('pitch-level-text');

    const pitchLFO = document.getElementById('pitch-lfo-sw');
    const pitchLFOPitch = document.getElementById('pitch-lfo-pitch');
    const pitchLFOPitchText = document.getElementById('pitch-lfo-pitch-text');
    const pitchLFOLevel = document.getElementById('pitch-lfo-level');
    const pitchLFOLevelText = document.getElementById('pitch-lfo-level-text');

    pitchEnvelope.addEventListener('click',(e)=>{
      updateTimbreFlagInfo(e.srcElement.checked,0x1);
    });

    pitchEGAttack.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,pitchEGAttackText,'pitch_envelope','attack_time');
    });

    pitchEGDecay.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,pitchEGDecayText,'pitch_envelope','decay_time');
    });

    pitchEGSustain.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,pitchEGSustainText,'pitch_envelope','sustain_level');
    });

    pitchEGRelease.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,pitchEGReleaseText,'pitch_envelope','release_time');
    });

    pitchEGLevel.addEventListener('input',(e)=>{
      updateEnvelopeParam(e.srcElement.value,pitchEGLevelText,'pitch_envelope','level');
    });

    pitchLFO.addEventListener('click',(e)=>{
      updateTimbreFlagInfo(e.srcElement.checked,0x2);
    });

    pitchLFOPitch.addEventListener('input',(e)=>{
      updateLFOParam(e.srcElement.value,pitchLFOPitchText,'pitch_lfo_work_offset','pitch');
    });
    
    pitchLFOLevel.addEventListener('input',(e)=>{
      updateLFOParam(e.srcElement.value,pitchLFOLevelText,'pitch_lfo_work_offset','level');
    });



    startButton.addEventListener('click', async () => {

      if (!psg) {
        // Shared Memoryの利用
        // wasmバイナリの読み込み
        psgBin = await (await fetch('./wpsg.wasm')).arrayBuffer();

        memoryMap = await fetch('./wpsg.context.json');
        memoryMap = await memoryMap.json();

        audioctx = new AudioContext();
        // 100ms分のバッファサイズを求める
        let audioBufferSize = Math.pow(2, Math.ceil(Math.log2(audioctx.sampleRate * 4 * 0.1)));

        sharedMemory = new WebAssembly.Memory({ initial: 20, shared: true, maximum: 20 });
        sharedMemoryView = new DataView(sharedMemory.buffer);

        wasmModule = await WebAssembly.compile(psgBin);
        wasmFuncs = (await WebAssembly.instantiate(wasmModule, { env: { memory: sharedMemory }, imports: { sin: Math.sin, cos: Math.cos, exp: Math.exp, sinh: Math.sinh, pow: Math.pow } })).exports;

        wasmFuncs.setRate(audioctx.sampleRate);
        wasmFuncs.initMemory();
        wasmFuncs.initOutputBuffer(audioBufferSize);

        const ia = new Int32Array(sharedMemory.buffer);
        // Atomics.store(ia,getOffset(memoryMap.buffer_size) >> 2,audioBufferSize);

        await audioctx.audioWorklet.addModule("./wpsg.js");
        psg = new AudioWorkletNode(audioctx, "PSG", {
          outputChannelCount: [2]
        });

        psgWorker = new Worker('./wpsg-worker.js');
        psgWorker.onmessage = function (e) {
          if (e.data.message) {
            if (e.data.message == 'init') {
              timbre = e.data.timbre;
              disableInputs(false);
              drawMemory();
            }
          }
          console.log(e.data);
        };

        psgWorker.onerror = function (e) {
          console.log(e);
        };

        psg.port.postMessage({
          message: 'init',
          memory: sharedMemory,
          bufferStart: getOffset(memoryMap.output_buffer_offset),
          readOffset: getOffset(memoryMap.read_offset),
          writeOffset: getOffset(memoryMap.write_offset),
          bufferSize: getOffset(memoryMap.output_buffer_size),
          sampleRate: audioctx.sampleRate,
          endian: littleEndian
        });

        psgWorker.postMessage({
          message: 'init',
          wasmBinary: psgBin,
          memory: sharedMemory,
          sampleRate: audioctx.sampleRate,
          endian: littleEndian
        });

        vol = new GainNode(audioctx, { gain: 1.0 });
        psg.connect(vol).connect(audioctx.destination);

      }

      if (!play) {
        play = true;
        psgWorker.postMessage({ message: 'play' });
        psg.port.postMessage({ message: 'play' });
        vol.gain.value = 1.0;
        startButton.innerText = 'PSG-OFF';
      } else {
        disableInputs(true);
        play = false;
        psg.port.postMessage({ message: 'stop' });
        psgWorker.postMessage({ message: 'stop' });
        vol.gain.value = 0.0;
        startButton.innerText = 'PSG-ON';
      }
    });
    startButton.removeAttribute('disabled');
  });

}());
