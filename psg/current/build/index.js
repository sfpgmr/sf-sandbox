(function () {
  'use strict';

  var Syntax = {
    Note: "Note",
    Rest: "Rest",
    Octave: "Octave",
    OctaveShift: "OctaveShift",
    NoteLength: "NoteLength",
    NoteVelocity: "NoteVelocity",
    NoteQuantize: "NoteQuantize",
    Tempo: "Tempo",
    InfiniteLoop: "InfiniteLoop",
    LoopBegin: "LoopBegin",
    LoopExit: "LoopExit",
    LoopEnd: "LoopEnd",
    Tone:"Tone",
    WaveForm:"WaveForm",
    Envelope:"Envelope"
  };

  class Scanner {
    constructor(source) {
      this.source = source;
      this.index = 0;
    }

    hasNext() {
      return this.index < this.source.length;
    }

    peek() {
      return this.source.charAt(this.index) || "";
    }

    next() {
      return this.source.charAt(this.index++) || "";
    }

    forward() {
      while (this.hasNext() && this.match(/\s/)) {
        this.index += 1;
      }
    }

    match(matcher) {
      if (matcher instanceof RegExp) {
        return matcher.test(this.peek());
      }
      return this.peek() === matcher;
    }

    expect(matcher) {
      if (!this.match(matcher)) {
        this.throwUnexpectedToken();
      }
      this.index += 1;
    }

    scan(matcher) {
      let target = this.source.substr(this.index);
      let result = null;

      if (matcher instanceof RegExp) {
        let matched = matcher.exec(target);

        if (matched && matched.index === 0) {
          result = matched[0];
        }
      } else if (target.substr(0, matcher.length) === matcher) {
        result = matcher;
      }

      if (result) {
        this.index += result.length;
      }

      return result;
    }

    throwUnexpectedToken() {
      let identifier = this.peek() || "ILLEGAL";

      throw new SyntaxError(`Unexpected token: ${identifier}`);
    }
  }

  const NOTE_INDEXES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  class MMLParser {
    constructor(source) {
      this.scanner = new Scanner(source);
    }

    parse() {
      let result = [];

      this._readUntil(";", () => {
        result = result.concat(this.advance());
      });

      return result;
    }

    advance() {
      switch (this.scanner.peek()) {
      case "c":
      case "d":
      case "e":
      case "f":
      case "g":
      case "a":
      case "b":
        return this.readNote();
      case "[":
        return this.readChord();
      case "r":
        return this.readRest();
      case "o":
        return this.readOctave();
      case ">":
        return this.readOctaveShift(+1);
      case "<":
        return this.readOctaveShift(-1);
      case "l":
        return this.readNoteLength();
      case "q":
        return this.readNoteQuantize();
      case "v":
        return this.readNoteVelocity();
      case "t":
        return this.readTempo();
      case "$":
        return this.readInfiniteLoop();
      case "/":
        return this.readLoop();
      case "@":
        return this.readTone();
      case "w":
        return this.readWaveForm();
      case "s":
        return this.readEnvelope();
      default:
        // do nothing
      }
      this.scanner.throwUnexpectedToken();
    }

    readNote() {
      return {
        type: Syntax.Note,
        noteNumbers: [ this._readNoteNumber(0) ],
        noteLength: this._readLength(),
      };
    }

    readChord() {
      this.scanner.expect("[");

      let noteList = [];
      let offset = 0;

      this._readUntil("]", () => {
        switch (this.scanner.peek()) {
        case "c":
        case "d":
        case "e":
        case "f":
        case "g":
        case "a":
        case "b":
          noteList.push(this._readNoteNumber(offset));
          break;
        case ">":
          this.scanner.next();
          offset += 12;
          break;
        case "<":
          this.scanner.next();
          offset -= 12;
          break;
        default:
          this.scanner.throwUnexpectedToken();
        }
      });

      this.scanner.expect("]");

      return {
        type: Syntax.Note,
        noteNumbers: noteList,
        noteLength: this._readLength(),
      };
    }

    readRest() {
      this.scanner.expect("r");

      return {
        type: Syntax.Rest,
        noteLength: this._readLength(),
      };
    }

    readOctave() {
      this.scanner.expect("o");

      return {
        type: Syntax.Octave,
        value: this._readArgument(/\d+/),
      };
    }

    readOctaveShift(direction) {
      this.scanner.expect(/<|>/);

      return {
        type: Syntax.OctaveShift,
        direction: direction|0,
        value: this._readArgument(/\d+/),
      };
    }

    readNoteLength() {
      this.scanner.expect("l");

      return {
        type: Syntax.NoteLength,
        noteLength: this._readLength(),
      };
    }

    readNoteQuantize() {
      this.scanner.expect("q");

      return {
        type: Syntax.NoteQuantize,
        value: this._readArgument(/\d+/),
      };
    }

    readNoteVelocity() {
      this.scanner.expect("v");

      return {
        type: Syntax.NoteVelocity,
        value: this._readArgument(/\d+/),
      };
    }

    readTempo() {
      this.scanner.expect("t");

      return {
        type: Syntax.Tempo,
        value: this._readArgument(/\d+(\.\d+)?/),
      };
    }

    readInfiniteLoop() {
      this.scanner.expect("$");

      return {
        type: Syntax.InfiniteLoop,
      };
    }

    readLoop() {
      this.scanner.expect("/");
      this.scanner.expect(":");

      let result = [];
      let loopBegin = { type: Syntax.LoopBegin };
      let loopEnd = { type: Syntax.LoopEnd };

      result = result.concat(loopBegin);
      this._readUntil(/[|:]/, () => {
        result = result.concat(this.advance());
      });
      result = result.concat(this._readLoopExit());

      this.scanner.expect(":");
      this.scanner.expect("/");

      loopBegin.value = this._readArgument(/\d+/) || null;

      result = result.concat(loopEnd);

      return result;
    }
    
    readTone(){
      this.scanner.expect("@");
      return {
        type: Syntax.Tone,
        value: this._readArgument(/\d+/)
      };
    }
    
    readWaveForm(){
      this.scanner.expect("w");
      this.scanner.expect("\"");
      let waveData = this.scanner.scan(/[0-9a-fA-F]+?/);
      this.scanner.expect("\"");
      return {
        type: Syntax.WaveForm,
        value: waveData
      };
    }
    
    readEnvelope(){
      this.scanner.expect("s");
      let a = this._readArgument(/\d+(\.\d+)?/);
      this.scanner.expect(",");
      let d = this._readArgument(/\d+(\.\d+)?/);
      this.scanner.expect(",");
      let s = this._readArgument(/\d+(\.\d+)?/);
      this.scanner.expect(",");
      let r = this._readArgument(/\d+(\.\d+)?/);
      return {
        type:Syntax.Envelope,
        a:a,d:d,s:s,r:r
      }
    }

    _readUntil(matcher, callback) {
      while (this.scanner.hasNext()) {
        this.scanner.forward();
        if (!this.scanner.hasNext() || this.scanner.match(matcher)) {
          break;
        }
        callback();
      }
    }

    _readArgument(matcher) {
      let num = this.scanner.scan(matcher);

      return num !== null ? +num : null;
    }

    _readNoteNumber(offset) {
      let noteIndex = NOTE_INDEXES[this.scanner.next()];

      return noteIndex + this._readAccidental() + offset;
    }

    _readAccidental() {
      if (this.scanner.match("+")) {
        return +1 * this.scanner.scan(/\++/).length;
      }
      if (this.scanner.match("-")) {
        return -1 * this.scanner.scan(/\-+/).length;
      }
      return 0;
    }

    _readDot() {
      let len = (this.scanner.scan(/\.+/) || "").length;
      let result = new Array(len);

      for (let i = 0; i < len; i++) {
        result[i] = 0;
      }

      return result;
    }

    _readLength() {
      let result = [];

      result = result.concat(this._readArgument(/\d+/));
      result = result.concat(this._readDot());

      let tie = this._readTie();

      if (tie) {
        result = result.concat(tie);
      }

      return result;
    }

    _readTie() {
      this.scanner.forward();

      if (this.scanner.match("^")) {
        this.scanner.next();
        return this._readLength();
      }

      return null;
    }

    _readLoopExit() {
      let result = [];

      if (this.scanner.match("|")) {
        this.scanner.next();

        let loopExit = { type: Syntax.LoopExit };

        result = result.concat(loopExit);

        this._readUntil(":", () => {
          result = result.concat(this.advance());
        });
      }

      return result;
    }
  }

  var DefaultParams = {
    tempo: 120,
    octave: 4,
    length: 4,
    velocity: 100,
    quantize: 75,
    loopCount: 2,
  };

  /**
   * lzbase62
   *
   * @description  LZ77(LZSS) based compression algorithm in base62 for JavaScript.
   * @fileOverview Data compression library
   * @version      1.4.6
   * @date         2015-10-06
   * @link         https://github.com/polygonplanet/lzbase62
   * @copyright    Copyright (c) 2014-2015 polygon planet <polygon.planet.aqua@gmail.com>
   * @license      Licensed under the MIT license.
   */

  var fromCharCode = String.fromCharCode;

  var HAS_TYPED = typeof Uint8Array !== 'undefined' &&
    typeof Uint16Array !== 'undefined';

  // Test for String.fromCharCode.apply.
  var CAN_CHARCODE_APPLY = false;
  var CAN_CHARCODE_APPLY_TYPED = false;

  try {
    if (fromCharCode.apply(null, [0x61]) === 'a') {
      CAN_CHARCODE_APPLY = true;
    }
  } catch (e) { }

  if (HAS_TYPED) {
    try {
      if (fromCharCode.apply(null, new Uint8Array([0x61])) === 'a') {
        CAN_CHARCODE_APPLY_TYPED = true;
      }
    } catch (e) { }
  }

  // Function.prototype.apply stack max range
  var APPLY_BUFFER_SIZE = 65533;
  var APPLY_BUFFER_SIZE_OK = null;

  // IE has bug of String.prototype.lastIndexOf when second argument specified.
  var STRING_LASTINDEXOF_BUG = false;
  if ('abc\u307b\u3052'.lastIndexOf('\u307b\u3052', 1) !== -1) {
    STRING_LASTINDEXOF_BUG = true;
  }

  var BASE62TABLE =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  // Buffers
  var TABLE_LENGTH = BASE62TABLE.length;
  var TABLE_DIFF = Math.max(TABLE_LENGTH, 62) - Math.min(TABLE_LENGTH, 62);
  var BUFFER_MAX = TABLE_LENGTH - 1;

  // Sliding Window
  var WINDOW_MAX = 1024;
  var WINDOW_BUFFER_MAX = 304; // maximum 304

  // Chunk buffer length
  var COMPRESS_CHUNK_SIZE = APPLY_BUFFER_SIZE;
  var COMPRESS_CHUNK_MAX = COMPRESS_CHUNK_SIZE - TABLE_LENGTH;
  var DECOMPRESS_CHUNK_SIZE = APPLY_BUFFER_SIZE;
  var DECOMPRESS_CHUNK_MAX = DECOMPRESS_CHUNK_SIZE + WINDOW_MAX * 2;

  // Unicode table : U+0000 - U+0084
  var LATIN_CHAR_MAX = 11;
  var LATIN_BUFFER_MAX = LATIN_CHAR_MAX * (LATIN_CHAR_MAX + 1);

  // Unicode table : U+0000 - U+FFFF
  var UNICODE_CHAR_MAX = 40;
  var UNICODE_BUFFER_MAX = UNICODE_CHAR_MAX * (UNICODE_CHAR_MAX + 1);

  // Index positions
  var LATIN_INDEX = TABLE_LENGTH + 1;
  var LATIN_INDEX_START = TABLE_DIFF + 20;
  var UNICODE_INDEX = TABLE_LENGTH + 5;

  // Decode/Start positions
  var DECODE_MAX = TABLE_LENGTH - TABLE_DIFF - 19;
  var LATIN_DECODE_MAX = UNICODE_CHAR_MAX + 7;
  var CHAR_START = LATIN_DECODE_MAX + 1;
  var COMPRESS_START = CHAR_START + 1;
  var COMPRESS_FIXED_START = COMPRESS_START + 5;
  var COMPRESS_INDEX = COMPRESS_FIXED_START + 5; // 59

  // Currently, 60 and 61 of the position is not used yet.


  // Compressor
  function LZBase62Compressor(options) {
    this._init(options);
  }

  LZBase62Compressor.prototype = {
    _init: function (options) {
      options = options || {};

      this._data = null;
      this._table = null;
      this._result = null;
      this._onDataCallback = options.onData;
      this._onEndCallback = options.onEnd;
    },
    _createTable: function () {
      var table = createBuffer(8, TABLE_LENGTH);
      for (var i = 0; i < TABLE_LENGTH; i++) {
        table[i] = BASE62TABLE.charCodeAt(i);
      }
      return table;
    },
    _onData: function (buffer, length) {
      var data = bufferToString_fast(buffer, length);

      if (this._onDataCallback) {
        this._onDataCallback(data);
      } else {
        this._result += data;
      }
    },
    _onEnd: function () {
      if (this._onEndCallback) {
        this._onEndCallback();
      }
      this._data = this._table = null;
    },
    // Searches for a longest match
    _search: function () {
      var i = 2;
      var data = this._data;
      var offset = this._offset;
      var len = BUFFER_MAX;
      if (this._dataLen - offset < len) {
        len = this._dataLen - offset;
      }
      if (i > len) {
        return false;
      }

      var pos = offset - WINDOW_BUFFER_MAX;
      var win = data.substring(pos, offset + len);
      var limit = offset + i - 3 - pos;
      var j, s, index, lastIndex, bestIndex, winPart;

      do {
        if (i === 2) {
          s = data.charAt(offset) + data.charAt(offset + 1);

          // Fast check by pre-match for the slow lastIndexOf.
          index = win.indexOf(s);
          if (!~index || index > limit) {
            break;
          }
        } else if (i === 3) {
          s = s + data.charAt(offset + 2);
        } else {
          s = data.substr(offset, i);
        }

        if (STRING_LASTINDEXOF_BUG) {
          winPart = data.substring(pos, offset + i - 1);
          lastIndex = winPart.lastIndexOf(s);
        } else {
          lastIndex = win.lastIndexOf(s, limit);
        }

        if (!~lastIndex) {
          break;
        }

        bestIndex = lastIndex;
        j = pos + lastIndex;
        do {
          if (data.charCodeAt(offset + i) !== data.charCodeAt(j + i)) {
            break;
          }
        } while (++i < len);

        if (index === lastIndex) {
          i++;
          break;
        }

      } while (++i < len);

      if (i === 2) {
        return false;
      }

      this._index = WINDOW_BUFFER_MAX - bestIndex;
      this._length = i - 1;
      return true;
    },
    compress: function (data) {
      if (data == null || data.length === 0) {
        return '';
      }

      var result = '';
      var table = this._createTable();
      var win = createWindow();
      var buffer = createBuffer(8, COMPRESS_CHUNK_SIZE);
      var i = 0;

      this._result = '';
      this._offset = win.length;
      this._data = win + data;
      this._dataLen = this._data.length;
      win = data = null;

      var index = -1;
      var lastIndex = -1;
      var c, c1, c2, c3, c4;

      while (this._offset < this._dataLen) {
        if (!this._search()) {
          c = this._data.charCodeAt(this._offset++);
          if (c < LATIN_BUFFER_MAX) {
            if (c < UNICODE_CHAR_MAX) {
              c1 = c;
              c2 = 0;
              index = LATIN_INDEX;
            } else {
              c1 = c % UNICODE_CHAR_MAX;
              c2 = (c - c1) / UNICODE_CHAR_MAX;
              index = c2 + LATIN_INDEX;
            }

            // Latin index
            if (lastIndex === index) {
              buffer[i++] = table[c1];
            } else {
              buffer[i++] = table[index - LATIN_INDEX_START];
              buffer[i++] = table[c1];
              lastIndex = index;
            }
          } else {
            if (c < UNICODE_BUFFER_MAX) {
              c1 = c;
              c2 = 0;
              index = UNICODE_INDEX;
            } else {
              c1 = c % UNICODE_BUFFER_MAX;
              c2 = (c - c1) / UNICODE_BUFFER_MAX;
              index = c2 + UNICODE_INDEX;
            }

            if (c1 < UNICODE_CHAR_MAX) {
              c3 = c1;
              c4 = 0;
            } else {
              c3 = c1 % UNICODE_CHAR_MAX;
              c4 = (c1 - c3) / UNICODE_CHAR_MAX;
            }

            // Unicode index
            if (lastIndex === index) {
              buffer[i++] = table[c3];
              buffer[i++] = table[c4];
            } else {
              buffer[i++] = table[CHAR_START];
              buffer[i++] = table[index - TABLE_LENGTH];
              buffer[i++] = table[c3];
              buffer[i++] = table[c4];

              lastIndex = index;
            }
          }
        } else {
          if (this._index < BUFFER_MAX) {
            c1 = this._index;
            c2 = 0;
          } else {
            c1 = this._index % BUFFER_MAX;
            c2 = (this._index - c1) / BUFFER_MAX;
          }

          if (this._length === 2) {
            buffer[i++] = table[c2 + COMPRESS_FIXED_START];
            buffer[i++] = table[c1];
          } else {
            buffer[i++] = table[c2 + COMPRESS_START];
            buffer[i++] = table[c1];
            buffer[i++] = table[this._length];
          }

          this._offset += this._length;
          if (~lastIndex) {
            lastIndex = -1;
          }
        }

        if (i >= COMPRESS_CHUNK_MAX) {
          this._onData(buffer, i);
          i = 0;
        }
      }

      if (i > 0) {
        this._onData(buffer, i);
      }

      this._onEnd();
      result = this._result;
      this._result = null;
      return result === null ? '' : result;
    }
  };


  // Decompressor
  function LZBase62Decompressor(options) {
    this._init(options);
  }

  LZBase62Decompressor.prototype = {
    _init: function (options) {
      options = options || {};

      this._result = null;
      this._onDataCallback = options.onData;
      this._onEndCallback = options.onEnd;
    },
    _createTable: function () {
      var table = {};
      for (var i = 0; i < TABLE_LENGTH; i++) {
        table[BASE62TABLE.charAt(i)] = i;
      }
      return table;
    },
    _onData: function (ended) {
      var data;

      if (this._onDataCallback) {
        if (ended) {
          data = this._result;
          this._result = [];
        } else {
          var len = DECOMPRESS_CHUNK_SIZE - WINDOW_MAX;
          data = this._result.slice(WINDOW_MAX, WINDOW_MAX + len);

          this._result = this._result.slice(0, WINDOW_MAX).concat(
            this._result.slice(WINDOW_MAX + len));
        }

        if (data.length > 0) {
          this._onDataCallback(bufferToString_fast(data));
        }
      }
    },
    _onEnd: function () {
      if (this._onEndCallback) {
        this._onEndCallback();
      }
    },
    decompress: function (data) {
      if (data == null || data.length === 0) {
        return '';
      }

      this._result = stringToArray(createWindow());
      var result = '';
      var table = this._createTable();

      var out = false;
      var index = null;
      var len = data.length;
      var offset = 0;

      var i, c, c2, c3;
      var code, pos, length, sub, subLen, expandLen;

      for (; offset < len; offset++) {
        c = table[data.charAt(offset)];
        if (c === void 0) {
          continue;
        }

        if (c < DECODE_MAX) {
          if (!out) {
            // Latin index
            code = index * UNICODE_CHAR_MAX + c;
          } else {
            // Unicode index
            c3 = table[data.charAt(++offset)];
            code = c3 * UNICODE_CHAR_MAX + c + UNICODE_BUFFER_MAX * index;
          }
          this._result[this._result.length] = code;
        } else if (c < LATIN_DECODE_MAX) {
          // Latin starting point
          index = c - DECODE_MAX;
          out = false;
        } else if (c === CHAR_START) {
          // Unicode starting point
          c2 = table[data.charAt(++offset)];
          index = c2 - 5;
          out = true;
        } else if (c < COMPRESS_INDEX) {
          c2 = table[data.charAt(++offset)];

          if (c < COMPRESS_FIXED_START) {
            pos = (c - COMPRESS_START) * BUFFER_MAX + c2;
            length = table[data.charAt(++offset)];
          } else {
            pos = (c - COMPRESS_FIXED_START) * BUFFER_MAX + c2;
            length = 2;
          }

          sub = this._result.slice(-pos);
          if (sub.length > length) {
            sub.length = length;
          }
          subLen = sub.length;

          if (sub.length > 0) {
            expandLen = 0;
            while (expandLen < length) {
              for (i = 0; i < subLen; i++) {
                this._result[this._result.length] = sub[i];
                if (++expandLen >= length) {
                  break;
                }
              }
            }
          }
          index = null;
        }

        if (this._result.length >= DECOMPRESS_CHUNK_MAX) {
          this._onData();
        }
      }

      this._result = this._result.slice(WINDOW_MAX);
      this._onData(true);
      this._onEnd();

      result = bufferToString_fast(this._result);
      this._result = null;
      return result;
    }
  };


  // Create Sliding window
  function createWindow() {
    var alpha = 'abcdefghijklmnopqrstuvwxyz';
    var win = '';
    var len = alpha.length;
    var i, j, c, c2;

    for (i = 0; i < len; i++) {
      c = alpha.charAt(i);
      for (j = len - 1; j > 15 && win.length < WINDOW_MAX; j--) {
        c2 = alpha.charAt(j);
        win += ' ' + c + ' ' + c2;
      }
    }

    while (win.length < WINDOW_MAX) {
      win = ' ' + win;
    }
    win = win.slice(0, WINDOW_MAX);

    return win;
  }


  function truncateBuffer(buffer, length) {
    if (buffer.length === length) {
      return buffer;
    }

    if (buffer.subarray) {
      return buffer.subarray(0, length);
    }

    buffer.length = length;
    return buffer;
  }


  function bufferToString_fast(buffer, length) {
    if (length == null) {
      length = buffer.length;
    } else {
      buffer = truncateBuffer(buffer, length);
    }

    if (CAN_CHARCODE_APPLY && CAN_CHARCODE_APPLY_TYPED) {
      if (length < APPLY_BUFFER_SIZE) {
        if (APPLY_BUFFER_SIZE_OK) {
          return fromCharCode.apply(null, buffer);
        }

        if (APPLY_BUFFER_SIZE_OK === null) {
          try {
            var s = fromCharCode.apply(null, buffer);
            if (length > APPLY_BUFFER_SIZE) {
              APPLY_BUFFER_SIZE_OK = true;
            }
            return s;
          } catch (e) {
            // Ignore RangeError: arguments too large
            APPLY_BUFFER_SIZE_OK = false;
          }
        }
      }
    }

    return bufferToString_chunked(buffer);
  }


  function bufferToString_chunked(buffer) {
    var string = '';
    var length = buffer.length;
    var i = 0;
    var sub;

    while (i < length) {
      if (buffer.subarray) {
        sub = buffer.subarray(i, i + APPLY_BUFFER_SIZE);
      } else {
        sub = buffer.slice(i, i + APPLY_BUFFER_SIZE);
      }
      i += APPLY_BUFFER_SIZE;

      if (APPLY_BUFFER_SIZE_OK) {
        string += fromCharCode.apply(null, sub);
        continue;
      }

      if (APPLY_BUFFER_SIZE_OK === null) {
        try {
          string += fromCharCode.apply(null, sub);
          if (sub.length > APPLY_BUFFER_SIZE) {
            APPLY_BUFFER_SIZE_OK = true;
          }
          continue;
        } catch (e) {
          APPLY_BUFFER_SIZE_OK = false;
        }
      }

      return bufferToString_slow(buffer);
    }

    return string;
  }


  function bufferToString_slow(buffer) {
    var string = '';
    var length = buffer.length;

    for (var i = 0; i < length; i++) {
      string += fromCharCode(buffer[i]);
    }

    return string;
  }


  function createBuffer(bits, size) {
    if (!HAS_TYPED) {
      return new Array(size);
    }

    switch (bits) {
      case 8: return new Uint8Array(size);
      case 16: return new Uint16Array(size);
    }
  }


  function stringToArray(string) {
    var array = [];
    var len = string && string.length;

    for (var i = 0; i < len; i++) {
      array[i] = string.charCodeAt(i);
    }

    return array;
  }


  /**
   * @name lzbase62
   * @type {Object}
   * @public
   * @class
   */
  const lzbase62 = {
    /**
     * @lends lzbase62
     */
    /**
     * Compress data to a base 62(0-9a-zA-Z) encoded string.
     *
     * @param {string|Buffer} data Input data
     * @param {Object=} [options] Options
     * @return {string} Compressed data
     */
    compress: function (data, options) {
      return new LZBase62Compressor(options).compress(data);
    },
    /**
     * Decompress data from a base 62(0-9a-zA-Z) encoded string.
     *
     * @param {string} data Input data
     * @param {Object=} [options] Options
     * @return {string} Decompressed data
     */
    decompress: function (data, options) {
      return new LZBase62Decompressor(options).decompress(data);
    }
  };

  // var fft = new FFT(4096, 44100);
  const BUFFER_SIZE = 1024;
  const TIME_BASE = 96;

  // MIDIノート => 再生レート変換テーブル
  var noteFreq = [];
  for (var i = -69; i < 58; ++i) {
    noteFreq.push(Math.pow(2, i / 12));
  }

  function decodeStr(bits, wavestr) {
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
  function WaveSample(audioctx, ch, sampleLength, sampleRate) {

    this.sample = audioctx.createBuffer(ch, sampleLength, sampleRate || audioctx.sampleRate);
    this.loop = false;
    this.start = 0;
    this.end = (sampleLength - 1) / (sampleRate || audioctx.sampleRate);
  }

  function createWaveSampleFromWaves(audioctx, sampleLength) {
    for (var i = 0, end = waves.length; i < end; ++i) {
      var sample = new WaveSample(audioctx, 1, sampleLength);
      waveSamples.push(sample);
      if (i != 8) {
        var wavedata = waves[i];
        var delta = 440.0 * wavedata.length / audioctx.sampleRate;
        var stime = 0;
        var output = sample.sample.getChannelData(0);
        var len = wavedata.length;
        var index = 0;
        var endsample = 0;
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
    { name: 'bass1', path: '../../common/bd1_lz.json' }, // @9
    { name: 'bass2', path: '../../common/bd2_lz.json' }, // @10
    { name: 'closed', path: '../../common/closed_lz.json' }, // @11
    { name: 'cowbell', path: '../../common/cowbell_lz.json' },// @12
    { name: 'crash', path: '../../common/crash_lz.json' },// @13
    { name: 'handclap', path: '../../common/handclap_lz.json' }, // @14
    { name: 'hitom', path: '../../common/hitom_lz.json' },// @15
    { name: 'lowtom', path: '../../common/lowtom_lz.json' },// @16
    { name: 'midtom', path: '../../common/midtom_lz.json' },// @17
    { name: 'open', path: '../../common/open_lz.json' },// @18
    { name: 'ride', path: '../../common/ride_lz.json' },// @19
    { name: 'rimshot', path: '../../common/rimshot_lz.json' },// @20
    { name: 'sd1', path: '../../common/sd1_lz.json' },// @21
    { name: 'sd2', path: '../../common/sd2_lz.json' },// @22
    { name: 'tamb', path: '../../common/tamb_lz.json' }// @23
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
  class EnvelopeGenerator {
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
  }
  class Voice {
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

  class Audio {
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
        this.periodicWaves = createPeriodicWaveFromWaves(this.audioctx);
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

  class Note {
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


  /// 音符の長さ指定

  class Length {
    constructor(len) {
      this.step = calcStep(len);
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
      };
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

  ////////////////////////////
  /// シーケンサー本体 
  class Sequencer {
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

  const seqData = {
    name: 'Test',
    tracks: [
  /*    {
        name: 'part1',
        channel: 0,
        mml:
        `
         s0.01,0.2,0.2,0.03 @2 
         t140  q35 v30 l1r1r1r1r1 $l16o3 cccccccc<ggggaabb> cccccccc<gggg>cc<bb b-b-b-b-b-b-b-b-ffffggg+g+ g+g+g+g+g+g+g+g+ggggaabb >
               `
        },*/
      {
        name: 'part1',
        channel: 1,
        mml:
        `
      s0.01,0.01,0.8,0.05 @6 
      t160  q80 v40 o3 l16 
      erer erer erer erer drdr drdr drdr drdr crcr crcr crcr crcr drdr drdr drdr drdr $ 
      /:erer erer erer erer drdr drdr drdr drdr crcr crcr crcr crcr drdr drdr drdr drdr:/4   
      /:erer rrgr rrgr rrar r1 erer rrgr rrgr rrdr r1:/2     
     `      
        // `
        //  s0.01,0.01,0.8,0.05 @6 
        //  t160  q80 v40 o3 l16 $ /:erer erer erer erer drdr drdr drdr drdr crcr crcr crcr crcr drdr drdr drdr drdr:/4 
        // `
         },
      {
        name: 'part1',
        channel: 2,
        mml:
        `
       s0.01,0.2,0.2,0.1 @2
       t160 q95 v10 o4 l1 
       r1r1r1r1 $
       /:[b>e<]2..[>dg<][>ea<][>g>c<<]2[>a>d<<]2r8:/4
       rrrr rrrr
      `
        },

      {
        name: 'base drum',
        channel: 3,
        mml:
        `s0.01,0.01,1.0,0.05 o5 t160 @10 v60 q10 l4
      bbbb bbbb bbbb bbbb 
      $
      l4q10/:bbbb bbbb bbbb bbbb:/4
      /:l16q20brrr rrbr rrbr rrbr q10l8brbrbbbr q20l16bbrr rrbr rrbr rrbr q10l8brbrq20l16bbbbl8br :/2
      `
      }
      ,
      {
        name: 'snare',
        channel: 4,
        mml:
        `s0.01,0.01,1.0,0.05 o5 t160 @21 v60 q80 $/:l4rbrb:/3l4rbrl16bbbb`
      }
      ,
      {
        name: 'hi hat',
        channel: 5,
        mml:
        `s0.01,0.01,1.0,0.05 o6 t160 @11 l16 q40 $ v15 c v8 cv20cv8c`
      }
      // ,
      // {
      //   name: 'part5',
      //   channel: 4,
      //   mml:
      //   `s0.01,0.01,1.0,0.05 o5 t160 @20 q95 $v20 l4 rrrg `
      // }
    ]
  };

  //The MIT License (MIT)

  window.addEventListener('load', async () => {
    // let psgBin = await (await fetch('./wpsg.wasm')).arrayBuffer();
    
    
    // let psg;
    let play = false;
    // let vol;
    // let enable = 0x3f;
    // let envShape = 0;
    const startButton = document.getElementById('start');
    let inputs = document.querySelectorAll('input');
    // let currentChannel = 0;

    // for(const i of inputs){
    //   i.disabled = 'disabled';
    // }

    // const chTabs = document.querySelectorAll('#WPSG-Ch-Tabs > div');
    // chTabs.forEach((elm,k,p)=>{
    //   elm.addEventListener('click',function(){
    //     if(currentChannel != parseInt(this.dataset.ch)){
    //       document.querySelector('#WPSG-Ch-Tabs > div[data-ch="' + currentChannel + '"]').classList.remove('siimple-tabs-item--selected');
    //       currentChannel = parseInt(this.dataset.ch);
    //       elm.classList.add('siimple-tabs-item--selected');
    //     }
    //   });
    // });

    // const WPSGEnableCheckBox = document.getElementById('WPSG-Enable');
    // const WPSGFreqSlider = document.getElementById('WPSG-Freq');
    // const WPSGFreqText = document.getElementById('WPSG-Freq');
    // const WPSGVolumeSlider = document.getElementById('WPSG-Volume');
    // const WPSGVolumeText = document.getElementById('WPSG-Volume');

    
    // ['A','B','C'].forEach((ch,i)=>{
    //   // Tone
    //   const period = document.getElementById(ch + '-Period');
    //   period.addEventListener('input',function(){
    //     document.getElementById(ch + '-Period-Text').innerText = this.value;
    //     psg.writeReg(i * 2,this.value & 0xff);
    //     psg.writeReg(i * 2 + 1,(this.value & 0xf00) >> 8);
    //   });

    //   // Noise On/OFF
    //   const noise = document.getElementById('Noise-' + ch);
    //   noise.addEventListener('click',function(){
    //     const m = (1 << (i+3)) ^ 0x3f; 
    //     let v = ((this.checked?0:1) << (i+3));
    //     enable = (enable & m) | v;
    //     console.log(m,v,(enable).toString(2));
    //     psg.writeReg(7,enable);
    //   });

    //   // Tone On/OFF
    //   const tone = document.getElementById('Tone-' + ch);
    //   tone.addEventListener('click',function(){
    //     const m = (1 << i) ^ 0x3f; 
    //     let v = ((this.checked?0:1) << i);
    //     enable = (enable & m) | v;
    //     console.log(m,v,(enable).toString(2));
    //     psg.writeReg(7,enable);
    //   });


    //   // Volume 
    //   const volume = document.getElementById('Volume-' + ch);
    //   volume.addEventListener('input',function(){
    //     document.getElementById('Volume-' + ch + '-Text').innerText = this.value;
    //     let v = document.getElementById('Env-' + ch).checked?16:0 | this.value; 
    //     psg.writeReg(8 + i,v);
    //   });

    //   // Envelope On/Off
    //   const env = document.getElementById('Env-' + ch);
    //   env.addEventListener('click',function(){
    //     let v = this.checked?16:0;
    //     v = v | volume.value;
    //     psg.writeReg(8 + i,v);
    //   });

    // });

    // // Noise Period

    // const noise = document.getElementById('Noise-Period');
    // noise.addEventListener('input',function(){
    //   document.getElementById('Noise-Period-Text').innerText = this.value;
    //   psg.writeReg(6,this.value);
    // });

    // // Enevlope Period

    // const envPeriod = document.getElementById('Env-Period');
    // envPeriod.addEventListener('input',function(){
    //   document.getElementById('Env-Period-Text').innerText = this.value;
    //   psg.writeReg(11,this.value & 0xff);
    //   psg.writeReg(12,(this.value & 0xff00) >> 8 );
    // });

    // // Envelope Shape

    // ['Continue','Attack','Alternate','Hold'].reverse().forEach((p,i)=>{
    //   const param = document.getElementById(p);
    //   param.addEventListener('click',function(){
    //     let m = (1 << i) ^ 0xf;
    //     let v = (this.checked?1:0) << i;
    //     envShape = (envShape & m) | v;
    //     psg.writeReg(13,envShape);
    //   });
    // });

    startButton.addEventListener('click', async () => {
      try {
      const audio = new Audio();
      //await audio.readDrumSamples;
      const seq = new Sequencer(audio);
      seq.load(seqData);
      seq.start();



      // if (!psg) {
      //   var audioctx = new AudioContext();
      //   await audioctx.audioWorklet.addModule("./psg.js");
      //   psg = new AudioWorkletNode(audioctx, "PSG", {
      //     outputChannelCount: [2],
      //     processorOptions: {
      //       wasmBinary: psgBin,
      //       sampleRate: 17900000
      //     }
      //   });

      //   psg.writeReg = (function (reg, value) {
      //     this.port.postMessage(
      //       {
      //         message: 'writeReg', reg: reg, value: value
      //       }
      //     )
      //   }).bind(psg);

      //   psg.port.onmessage = function (e) {
      //     console.log(e.data);
      //   };

      //   // psg.writeReg(8, 31);
      //   // psg.writeReg(0, 0x32);
      //   // psg.writeReg(1, 0x01);
      //   // psg.writeReg(2, 0x5d);
      //   // psg.writeReg(3, 0x02);
      //   // psg.writeReg(4, 0x4d);
      //   // psg.writeReg(5, 0x03);
      //   //psg.writeReg(7, enable);

      //   vol = new GainNode(audioctx, { gain: 1.0 });
      //   psg.connect(vol).connect(audioctx.destination);
      //   console.log(audioctx.destination.channelCount);

      // }
      if (!play) {
        for(const i of inputs){
          i.disabled = '';
        }
        play = true;
        startButton.innerText = 'WPSG-OFF';
      } else {
        play = false;
        startButton.innerText = 'WPSG-ON';

      }
      } catch (e) {
        alert(e.stack);
      }

    });


    startButton.removeAttribute('disabled');
  });

}());
