(function () {
  'use strict';

  //
  // We store our EE objects in a plain object whose properties are event names.
  // If `Object.create(null)` is not supported we prefix the event names with a
  // `~` to make sure that the built-in object properties are not overridden or
  // used as an attack vector.
  // We also assume that `Object.create(null)` is available when the event name
  // is an ES6 Symbol.
  //
  var prefix = typeof Object.create !== 'function' ? '~' : false;

  /**
   * Representation of a single EventEmitter function.
   *
   * @param {Function} fn Event handler to be called.
   * @param {Mixed} context Context for function execution.
   * @param {Boolean} once Only emit once
   * @api private
   */
  function EE(fn, context, once) {
    this.fn = fn;
    this.context = context;
    this.once = once || false;
  }

  /**
   * Minimal EventEmitter interface that is molded against the Node.js
   * EventEmitter interface.
   *
   * @constructor
   * @api public
   */
  function EventEmitter() { /* Nothing to set */ }

  /**
   * Holds the assigned EventEmitters by name.
   *
   * @type {Object}
   * @private
   */
  EventEmitter.prototype._events = undefined;

  /**
   * Return a list of assigned event listeners.
   *
   * @param {String} event The events that should be listed.
   * @param {Boolean} exists We only need to know if there are listeners.
   * @returns {Array|Boolean}
   * @api public
   */
  EventEmitter.prototype.listeners = function listeners(event, exists) {
    var evt = prefix ? prefix + event : event
      , available = this._events && this._events[evt];

    if (exists) return !!available;
    if (!available) return [];
    if (available.fn) return [available.fn];

    for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
      ee[i] = available[i].fn;
    }

    return ee;
  };

  /**
   * Emit an event to all registered event listeners.
   *
   * @param {String} event The name of the event.
   * @returns {Boolean} Indication if we've emitted an event.
   * @api public
   */
  EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
    var evt = prefix ? prefix + event : event;

    if (!this._events || !this._events[evt]) return false;

    var listeners = this._events[evt]
      , len = arguments.length
      , args
      , i;

    if ('function' === typeof listeners.fn) {
      if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

      switch (len) {
        case 1: return listeners.fn.call(listeners.context), true;
        case 2: return listeners.fn.call(listeners.context, a1), true;
        case 3: return listeners.fn.call(listeners.context, a1, a2), true;
        case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
        case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
        case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
      }

      for (i = 1, args = new Array(len -1); i < len; i++) {
        args[i - 1] = arguments[i];
      }

      listeners.fn.apply(listeners.context, args);
    } else {
      var length = listeners.length
        , j;

      for (i = 0; i < length; i++) {
        if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

        switch (len) {
          case 1: listeners[i].fn.call(listeners[i].context); break;
          case 2: listeners[i].fn.call(listeners[i].context, a1); break;
          case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
          default:
            if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
              args[j - 1] = arguments[j];
            }

            listeners[i].fn.apply(listeners[i].context, args);
        }
      }
    }

    return true;
  };

  /**
   * Register a new EventListener for the given event.
   *
   * @param {String} event Name of the event.
   * @param {Functon} fn Callback function.
   * @param {Mixed} context The context of the function.
   * @api public
   */
  EventEmitter.prototype.on = function on(event, fn, context) {
    var listener = new EE(fn, context || this)
      , evt = prefix ? prefix + event : event;

    if (!this._events) this._events = prefix ? {} : Object.create(null);
    if (!this._events[evt]) this._events[evt] = listener;
    else {
      if (!this._events[evt].fn) this._events[evt].push(listener);
      else this._events[evt] = [
        this._events[evt], listener
      ];
    }

    return this;
  };

  /**
   * Add an EventListener that's only called once.
   *
   * @param {String} event Name of the event.
   * @param {Function} fn Callback function.
   * @param {Mixed} context The context of the function.
   * @api public
   */
  EventEmitter.prototype.once = function once(event, fn, context) {
    var listener = new EE(fn, context || this, true)
      , evt = prefix ? prefix + event : event;

    if (!this._events) this._events = prefix ? {} : Object.create(null);
    if (!this._events[evt]) this._events[evt] = listener;
    else {
      if (!this._events[evt].fn) this._events[evt].push(listener);
      else this._events[evt] = [
        this._events[evt], listener
      ];
    }

    return this;
  };

  /**
   * Remove event listeners.
   *
   * @param {String} event The event we want to remove.
   * @param {Function} fn The listener that we need to find.
   * @param {Mixed} context Only remove listeners matching this context.
   * @param {Boolean} once Only remove once listeners.
   * @api public
   */

  EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
    var evt = prefix ? prefix + event : event;

    if (!this._events || !this._events[evt]) return this;

    var listeners = this._events[evt]
      , events = [];

    if (fn) {
      if (listeners.fn) {
        if (
             listeners.fn !== fn
          || (once && !listeners.once)
          || (context && listeners.context !== context)
        ) {
          events.push(listeners);
        }
      } else {
        for (var i = 0, length = listeners.length; i < length; i++) {
          if (
               listeners[i].fn !== fn
            || (once && !listeners[i].once)
            || (context && listeners[i].context !== context)
          ) {
            events.push(listeners[i]);
          }
        }
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) {
      this._events[evt] = events.length === 1 ? events[0] : events;
    } else {
      delete this._events[evt];
    }

    return this;
  };

  /**
   * Remove all listeners or only the listeners for the specified event.
   *
   * @param {String} event The event want to remove all listeners for.
   * @api public
   */
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
    if (!this._events) return this;

    if (event) delete this._events[prefix ? prefix + event : event];
    else this._events = prefix ? {} : Object.create(null);

    return this;
  };

  //
  // Alias methods names because people roll like that.
  //
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  //
  // This function doesn't apply anymore.
  //
  EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
    return this;
  };

  //
  // Expose the prefix.
  //
  EventEmitter.prefixed = prefix;

  //
  // Expose the module.
  //
  if ('undefined' !== typeof module) {
   module.exports = EventEmitter;
  }

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /**
   * Common utilities
   * @module glMatrix
   */

  // Configuration Constants
  const EPSILON = 0.000001;
  let ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;

  const degree = Math.PI / 180;

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /**
   * 3x3 Matrix
   * @module mat3
   */

  /**
   * Creates a new identity mat3
   *
   * @returns {mat3} a new 3x3 matrix
   */
  function create$2() {
    let out = new ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /**
   * 4x4 Matrix
   * @module mat4
   */

  /**
   * Creates a new identity mat4
   *
   * @returns {mat4} a new 4x4 matrix
   */
  function create$3() {
    let out = new ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * Copy the values from one mat4 to another
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the source matrix
   * @returns {mat4} out
   */
  function copy$3(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }


  /**
   * Set a mat4 to the identity matrix
   *
   * @param {mat4} out the receiving matrix
   * @returns {mat4} out
   */
  function identity$3(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * Inverts a mat4
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the source matrix
   * @returns {mat4} out
   */
  function invert$3(out, a) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
      return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
  }

  /**
   * Multiplies two mat4s
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the first operand
   * @param {mat4} b the second operand
   * @returns {mat4} out
   */
  function multiply$3(out, a, b) {
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
  }

  /**
   * Scales the mat4 by the dimensions in the given vec3 not using vectorization
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the matrix to scale
   * @param {vec3} v the vec3 to scale the matrix by
   * @returns {mat4} out
   **/
  function scale$3(out, a, v) {
    let x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }

  /**
   * Rotates a matrix by the given angle around the X axis
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {mat4} out
   */
  function rotateX(out, a, rad) {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    let a10 = a[4];
    let a11 = a[5];
    let a12 = a[6];
    let a13 = a[7];
    let a20 = a[8];
    let a21 = a[9];
    let a22 = a[10];
    let a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
      out[0]  = a[0];
      out[1]  = a[1];
      out[2]  = a[2];
      out[3]  = a[3];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
  }

  /**
   * Rotates a matrix by the given angle around the Y axis
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {mat4} out
   */
  function rotateY(out, a, rad) {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    let a00 = a[0];
    let a01 = a[1];
    let a02 = a[2];
    let a03 = a[3];
    let a20 = a[8];
    let a21 = a[9];
    let a22 = a[10];
    let a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
      out[4]  = a[4];
      out[5]  = a[5];
      out[6]  = a[6];
      out[7]  = a[7];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
  }

  /**
   * Rotates a matrix by the given angle around the Z axis
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {mat4} out
   */
  function rotateZ(out, a, rad) {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    let a00 = a[0];
    let a01 = a[1];
    let a02 = a[2];
    let a03 = a[3];
    let a10 = a[4];
    let a11 = a[5];
    let a12 = a[6];
    let a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
      out[8]  = a[8];
      out[9]  = a[9];
      out[10] = a[10];
      out[11] = a[11];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
  }

  /**
   * Creates a matrix from a vector translation
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.translate(dest, dest, vec);
   *
   * @param {mat4} out mat4 receiving operation result
   * @param {vec3} v Translation vector
   * @returns {mat4} out
   */
  function fromTranslation$2(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }

  /**
   * Generates a perspective projection matrix with the given bounds
   *
   * @param {mat4} out mat4 frustum matrix will be written into
   * @param {number} fovy Vertical field of view in radians
   * @param {number} aspect Aspect ratio. typically viewport width/height
   * @param {number} near Near bound of the frustum
   * @param {number} far Far bound of the frustum
   * @returns {mat4} out
   */
  function perspective(out, fovy, aspect, near, far) {
    let f = 1.0 / Math.tan(fovy / 2);
    let nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
  }

  /**
   * Generates a look-at matrix with the given eye position, focal point, and up axis
   *
   * @param {mat4} out mat4 frustum matrix will be written into
   * @param {vec3} eye Position of the viewer
   * @param {vec3} center Point the viewer is looking at
   * @param {vec3} up vec3 pointing up
   * @returns {mat4} out
   */
  function lookAt(out, eye, center, up) {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    let eyex = eye[0];
    let eyey = eye[1];
    let eyez = eye[2];
    let upx = up[0];
    let upy = up[1];
    let upz = up[2];
    let centerx = center[0];
    let centery = center[1];
    let centerz = center[2];

    if (Math.abs(eyex - centerx) < EPSILON &&
        Math.abs(eyey - centery) < EPSILON &&
        Math.abs(eyez - centerz) < EPSILON) {
      return identity$3(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
  }

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /**
   * 3 Dimensional Vector
   * @module vec3
   */

  /**
   * Creates a new, empty vec3
   *
   * @returns {vec3} a new 3D vector
   */
  function create$4() {
    let out = new ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }

  /**
   * Calculates the length of a vec3
   *
   * @param {vec3} a vector to calculate length of
   * @returns {Number} length of a
   */
  function length(a) {
    let x = a[0];
    let y = a[1];
    let z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
  }

  /**
   * Creates a new vec3 initialized with the given values
   *
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @returns {vec3} a new 3D vector
   */
  function fromValues$4(x, y, z) {
    let out = new ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }

  /**
   * Normalize a vec3
   *
   * @param {vec3} out the receiving vector
   * @param {vec3} a vector to normalize
   * @returns {vec3} out
   */
  function normalize(out, a) {
    let x = a[0];
    let y = a[1];
    let z = a[2];
    let len = x*x + y*y + z*z;
    if (len > 0) {
      //TODO: evaluate use of glm_invsqrt here?
      len = 1 / Math.sqrt(len);
      out[0] = a[0] * len;
      out[1] = a[1] * len;
      out[2] = a[2] * len;
    }
    return out;
  }

  /**
   * Calculates the dot product of two vec3's
   *
   * @param {vec3} a the first operand
   * @param {vec3} b the second operand
   * @returns {Number} dot product of a and b
   */
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  /**
   * Computes the cross product of two vec3's
   *
   * @param {vec3} out the receiving vector
   * @param {vec3} a the first operand
   * @param {vec3} b the second operand
   * @returns {vec3} out
   */
  function cross(out, a, b) {
    let ax = a[0], ay = a[1], az = a[2];
    let bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }

  /**
   * Alias for {@link vec3.length}
   * @function
   */
  const len = length;

  /**
   * Perform some operation over an array of vec3s.
   *
   * @param {Array} a the array of vectors to iterate over
   * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
   * @param {Number} offset Number of elements to skip at the beginning of the array
   * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
   * @param {Function} fn Function to call for each vector in the array
   * @param {Object} [arg] additional argument to pass to fn
   * @returns {Array} a
   * @function
   */
  const forEach = (function() {
    let vec = create$4();

    return function(a, stride, offset, count, fn, arg) {
      let i, l;
      if(!stride) {
        stride = 3;
      }

      if(!offset) {
        offset = 0;
      }

      if(count) {
        l = Math.min((count * stride) + offset, a.length);
      } else {
        l = a.length;
      }

      for(i = offset; i < l; i += stride) {
        vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
        fn(vec, vec, arg);
        a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
      }

      return a;
    };
  })();

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /**
   * 4 Dimensional Vector
   * @module vec4
   */

  /**
   * Creates a new, empty vec4
   *
   * @returns {vec4} a new 4D vector
   */
  function create$5() {
    let out = new ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
  }

  /**
   * Creates a new vec4 initialized with the given values
   *
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @param {Number} w W component
   * @returns {vec4} a new 4D vector
   */
  function fromValues$5(x, y, z, w) {
    let out = new ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }

  /**
   * Normalize a vec4
   *
   * @param {vec4} out the receiving vector
   * @param {vec4} a vector to normalize
   * @returns {vec4} out
   */
  function normalize$1(out, a) {
    let x = a[0];
    let y = a[1];
    let z = a[2];
    let w = a[3];
    let len = x*x + y*y + z*z + w*w;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      out[0] = x * len;
      out[1] = y * len;
      out[2] = z * len;
      out[3] = w * len;
    }
    return out;
  }

  /**
   * Perform some operation over an array of vec4s.
   *
   * @param {Array} a the array of vectors to iterate over
   * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
   * @param {Number} offset Number of elements to skip at the beginning of the array
   * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
   * @param {Function} fn Function to call for each vector in the array
   * @param {Object} [arg] additional argument to pass to fn
   * @returns {Array} a
   * @function
   */
  const forEach$1 = (function() {
    let vec = create$5();

    return function(a, stride, offset, count, fn, arg) {
      let i, l;
      if(!stride) {
        stride = 4;
      }

      if(!offset) {
        offset = 0;
      }

      if(count) {
        l = Math.min((count * stride) + offset, a.length);
      } else {
        l = a.length;
      }

      for(i = offset; i < l; i += stride) {
        vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
        fn(vec, vec, arg);
        a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
      }

      return a;
    };
  })();

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /**
   * Quaternion
   * @module quat
   */

  /**
   * Creates a new identity quat
   *
   * @returns {quat} a new quaternion
   */
  function create$6() {
    let out = new ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }

  /**
   * Sets a quat from the given angle and rotation axis,
   * then returns it.
   *
   * @param {quat} out the receiving quaternion
   * @param {vec3} axis the axis around which to rotate
   * @param {Number} rad the angle in radians
   * @returns {quat} out
   **/
  function setAxisAngle(out, axis, rad) {
    rad = rad * 0.5;
    let s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
  }

  /**
   * Performs a spherical linear interpolation between two quat
   *
   * @param {quat} out the receiving quaternion
   * @param {quat} a the first operand
   * @param {quat} b the second operand
   * @param {Number} t interpolation amount between the two inputs
   * @returns {quat} out
   */
  function slerp(out, a, b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations
    let ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];

    let omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
      cosom = -cosom;
      bx = - bx;
      by = - by;
      bz = - bz;
      bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
      // standard case (slerp)
      omega  = Math.acos(cosom);
      sinom  = Math.sin(omega);
      scale0 = Math.sin((1.0 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      // "from" and "to" quaternions are very close
      //  ... so we can do a linear interpolation
      scale0 = 1.0 - t;
      scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;

    return out;
  }

  /**
   * Creates a quaternion from the given 3x3 rotation matrix.
   *
   * NOTE: The resultant quaternion is not normalized, so you should be sure
   * to renormalize the quaternion yourself where necessary.
   *
   * @param {quat} out the receiving quaternion
   * @param {mat3} m rotation matrix
   * @returns {quat} out
   * @function
   */
  function fromMat3(out, m) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    let fTrace = m[0] + m[4] + m[8];
    let fRoot;

    if ( fTrace > 0.0 ) {
      // |w| > 1/2, may as well choose w > 1/2
      fRoot = Math.sqrt(fTrace + 1.0);  // 2w
      out[3] = 0.5 * fRoot;
      fRoot = 0.5/fRoot;  // 1/(4w)
      out[0] = (m[5]-m[7])*fRoot;
      out[1] = (m[6]-m[2])*fRoot;
      out[2] = (m[1]-m[3])*fRoot;
    } else {
      // |w| <= 1/2
      let i = 0;
      if ( m[4] > m[0] )
        i = 1;
      if ( m[8] > m[i*3+i] )
        i = 2;
      let j = (i+1)%3;
      let k = (i+2)%3;

      fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
      out[i] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
      out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
      out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }

    return out;
  }

  /**
   * Normalize a quat
   *
   * @param {quat} out the receiving quaternion
   * @param {quat} a quaternion to normalize
   * @returns {quat} out
   * @function
   */
  const normalize$2 = normalize$1;

  /**
   * Sets a quaternion to represent the shortest rotation from one
   * vector to another.
   *
   * Both vectors are assumed to be unit length.
   *
   * @param {quat} out the receiving quaternion.
   * @param {vec3} a the initial vector
   * @param {vec3} b the destination vector
   * @returns {quat} out
   */
  const rotationTo = (function() {
    let tmpvec3 = create$4();
    let xUnitVec3 = fromValues$4(1,0,0);
    let yUnitVec3 = fromValues$4(0,1,0);

    return function(out, a, b) {
      let dot$$1 = dot(a, b);
      if (dot$$1 < -0.999999) {
        cross(tmpvec3, xUnitVec3, a);
        if (len(tmpvec3) < 0.000001)
          cross(tmpvec3, yUnitVec3, a);
        normalize(tmpvec3, tmpvec3);
        setAxisAngle(out, tmpvec3, Math.PI);
        return out;
      } else if (dot$$1 > 0.999999) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        return out;
      } else {
        cross(tmpvec3, a, b);
        out[0] = tmpvec3[0];
        out[1] = tmpvec3[1];
        out[2] = tmpvec3[2];
        out[3] = 1 + dot$$1;
        return normalize$2(out, out);
      }
    };
  })();

  /**
   * Performs a spherical linear interpolation with two control points
   *
   * @param {quat} out the receiving quaternion
   * @param {quat} a the first operand
   * @param {quat} b the second operand
   * @param {quat} c the third operand
   * @param {quat} d the fourth operand
   * @param {Number} t interpolation amount
   * @returns {quat} out
   */
  const sqlerp = (function () {
    let temp1 = create$6();
    let temp2 = create$6();

    return function (out, a, b, c, d, t) {
      slerp(temp1, a, d, t);
      slerp(temp2, b, c, t);
      slerp(out, temp1, temp2, 2 * t * (1 - t));

      return out;
    };
  }());

  /**
   * Sets the specified quaternion with values corresponding to the given
   * axes. Each axis is a vec3 and is expected to be unit length and
   * perpendicular to all other specified axes.
   *
   * @param {vec3} view  the vector representing the viewing direction
   * @param {vec3} right the vector representing the local "right" direction
   * @param {vec3} up    the vector representing the local "up" direction
   * @returns {quat} out
   */
  const setAxes = (function() {
    let matr = create$2();

    return function(out, view, right, up) {
      matr[0] = right[0];
      matr[3] = right[1];
      matr[6] = right[2];

      matr[1] = up[0];
      matr[4] = up[1];
      matr[7] = up[2];

      matr[2] = -view[0];
      matr[5] = -view[1];
      matr[8] = -view[2];

      return normalize$2(out, fromMat3(out, matr));
    };
  })();

  /* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE. */

  /**
   * 2 Dimensional Vector
   * @module vec2
   */

  /**
   * Creates a new, empty vec2
   *
   * @returns {vec2} a new 2D vector
   */
  function create$7() {
    let out = new ARRAY_TYPE(2);
    out[0] = 0;
    out[1] = 0;
    return out;
  }

  /**
   * Perform some operation over an array of vec2s.
   *
   * @param {Array} a the array of vectors to iterate over
   * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
   * @param {Number} offset Number of elements to skip at the beginning of the array
   * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
   * @param {Function} fn Function to call for each vector in the array
   * @param {Object} [arg] additional argument to pass to fn
   * @returns {Array} a
   * @function
   */
  const forEach$2 = (function() {
    let vec = create$7();

    return function(a, stride, offset, count, fn, arg) {
      let i, l;
      if(!stride) {
        stride = 2;
      }

      if(!offset) {
        offset = 0;
      }

      if(count) {
        l = Math.min((count * stride) + offset, a.length);
      } else {
        l = a.length;
      }

      for(i = offset; i < l; i += stride) {
        vec[0] = a[i]; vec[1] = a[i+1];
        fn(vec, vec, arg);
        a[i] = vec[0]; a[i+1] = vec[1];
      }

      return a;
    };
  })();

  /**
   * @fileoverview gl-matrix - High performance matrix and vector operations
   * @author Brandon Jones
   * @author Colin MacKenzie IV
   * @version 2.4.0
   */

  // WebGL 2.0 APIをラッピングするクラス


  class GL2 {
    constructor(gl) {
      this.gl = gl;
    }

    // shaderSrcとtypeでWebGLShaderを作り返す
    createShader(shaderSrc, type) {
      // WebGL2RenderingContextコンテキスト
      const gl = this.gl;
      // WebGLShaderの生成
      const shader = gl.createShader(type);
      // WebGLShaderにシェーダーソースコードをセットする
      gl.shaderSource(shader, shaderSrc);
      // シェーダーソースコードをコンパイルする
      gl.compileShader(shader);
      // シェーダーのコンパイルが失敗した場合は例外を送出する
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    // フレームバッファをオブジェクトとして生成する関数
    createFrameBuffer(width, height){
      const gl = this.gl;
      // フレームバッファの生成
      const frameBuffer = gl.createFramebuffer();
      
      // フレームバッファをWebGLにバインド
      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
      
      // 深度バッファ用レンダーバッファの生成とバインド
      const depthRenderBuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
      
      // レンダーバッファを深度バッファとして設定
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
      
      // フレームバッファにレンダーバッファを関連付ける
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
      
      // フレームバッファ用テクスチャの生成
      const fTexture = gl.createTexture();
      
      // フレームバッファ用のテクスチャをバインド
      gl.bindTexture(gl.TEXTURE_2D, fTexture);
      
      // フレームバッファ用のテクスチャにカラー用のメモリ領域を確保
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      
      // テクスチャパラメータ
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      
      // フレームバッファにテクスチャを関連付ける
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
      
      // 各種オブジェクトのバインドを解除
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      
      // オブジェクトを返して終了
      return {frameBuffer : frameBuffer, depthBuffer : depthRenderBuffer, texture : fTexture};
    }

    // 2つのWebGLShader（頂点シェーダ・フラグメントシェーダ）
    // からWebGLProgramを作り返す
    createProgram(vs, fs) {

      // WebGL2RenderingContextコンテキスト
      const gl = this.gl;

      if(typeof vs == 'string'){
        vs = this.createShader(vs,gl.VERTEX_SHADER);
      }

      if(typeof fs == 'string'){
        fs = this.createShader(fs,gl.FRAGMENT_SHADER);
      }

      // WebGLProgramの作成
      const program = gl.createProgram();
      // 頂点シェーダをアタッチする
      gl.attachShader(program, vs);
      // フラグメントシェーダをアタッチする
      gl.attachShader(program, fs);
      // シェーダーをリンクする
      gl.linkProgram(program);
      // リンクが失敗したら例外を送出する
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }
      return program;
    }

    loadImage(url) {
      return new Promise((resolve,reject)=>{
        var image = new Image();
        try {
          image.src = url;
          image.onload = ()=>{
            resolve(image);
          };
        } catch (e){
          reject(e);
        }
       });
    }

    createTexture(url){

    }
  }

  const crtVShader =
    `#version 300 es
 precision mediump float;
 in vec2 position;
 in vec2 texcoord;
 
 out vec2 o_texcoord;


void main()	{
    o_texcoord = texcoord;
    gl_Position = vec4(position,0.0,1.0);   
  }
`;

  const crtFShader =
    `#version 300 es
precision mediump float;

uniform sampler2D map;
uniform vec2 resolution;
uniform float time;

in vec2 o_texcoord;
out vec4 out_color;

#define RGBA(r, g, b, a)	vec4(float(r)/255.0, float(g)/255.0, float(b)/255.0, float(a)/255.0)

const vec3 kBackgroundColor = RGBA(0x00, 0x00, 0x00, 0x00).rgb; // medium-blue sky
//const vec3 kBackgroundColor = RGBA(0xff, 0x00, 0xff, 0xff).rgb; // test magenta

// Emulated input resolution.
// Fix resolution to set amount.
// Note: 256x224 is the most common resolution of the SNES, and that of Super Mario World.
vec2 res = vec2(
  240.0 / 1.0,
  320.0 / 1.0
);

// Hardness of scanline.
//	-8.0 = soft
// -16.0 = medium
float sHardScan = -8.0;

// Hardness of pixels in scanline.
// -2.0 = soft
// -4.0 = hard
const float kHardPix = -3.0;

// Display warp.
// 0.0 = none
// 1.0 / 8.0 = extreme
const vec2 kWarp = vec2(1.0 / 32.0, 1.0 / 24.0);
//const vec2 kWarp = vec2(0);

// Amount of shadow mask.
float kMaskDark = 0.5;
float kMaskLight = 1.5;

//------------------------------------------------------------------------

// sRGB to Linear.
// Assuing using sRGB typed textures this should not be needed.
float toLinear1(float c) {
	return (c <= 0.04045) ?
		(c / 12.92) :
		pow((c + 0.055) / 1.055, 2.4);
}
vec3 toLinear(vec3 c) {
	return vec3(toLinear1(c.r), toLinear1(c.g), toLinear1(c.b));
}

// Linear to sRGB.
// Assuing using sRGB typed textures this should not be needed.
float toSrgb1(float c) {
	return(c < 0.0031308 ?
		(c * 12.92) :
		(1.055 * pow(c, 0.41666) - 0.055));
}
vec3 toSrgb(vec3 c) {
	return vec3(toSrgb1(c.r), toSrgb1(c.g), toSrgb1(c.b));
}

// Nearest emulated sample given floating point position and texel offset.
// Also zero's off screen.
vec4 fetch(vec2 pos, vec2 off)
{
	pos = floor(pos * resolution + off) / resolution;
	if (max(abs(pos.x - 0.5), abs(pos.y - 0.5)) > 0.5)
		return vec4(vec3(0.0), 0.0);
   	
//    vec4 sampledColor = texture(iChannel0, pos.xy, -16.0);
    vec4 sampledColor = texture(map, pos.xy, -16.0);
    
    sampledColor = vec4(
        (sampledColor.rgb * sampledColor.a) +
        	(kBackgroundColor * (1.0 - sampledColor.a)),
        1.0
    );
    
	return vec4(
        toLinear(sampledColor.rgb),
        sampledColor.a
    );
}

// Distance in emulated pixels to nearest texel.
vec2 dist(vec2 pos) {
	pos = pos * res;
	return -((pos - floor(pos)) - vec2(0.5));
}

// 1D Gaussian.
float gaus(float pos, float scale) {
	return exp2(scale * pos * pos);
}

// 3-tap Gaussian filter along horz line.
vec3 horz3(vec2 pos, float off)
{
	vec3 b = fetch(pos, vec2(-1.0, off)).rgb;
	vec3 c = fetch(pos, vec2( 0.0, off)).rgb;
	vec3 d = fetch(pos, vec2(+1.0, off)).rgb;
	float dst = dist(pos).x;
	// Convert distance to weight.
	float scale = kHardPix;
	float wb = gaus(dst - 1.0, scale);
	float wc = gaus(dst + 0.0, scale);
	float wd = gaus(dst + 1.0, scale);
	// Return filtered sample.
	return (b * wb + c * wc + d * wd) / (wb + wc + wd);
}

// 5-tap Gaussian filter along horz line.
vec3 horz5(vec2 pos, float off)
{
	vec3 a = fetch(pos, vec2(-2.0, off)).rgb;
	vec3 b = fetch(pos, vec2(-1.0, off)).rgb;
	vec3 c = fetch(pos, vec2( 0.0, off)).rgb;
	vec3 d = fetch(pos, vec2(+1.0, off)).rgb;
	vec3 e = fetch(pos, vec2(+2.0, off)).rgb;
	float dst = dist(pos).x;
	// Convert distance to weight.
	float scale = kHardPix;
	float wa = gaus(dst - 2.0, scale);
	float wb = gaus(dst - 1.0, scale);
	float wc = gaus(dst + 0.0, scale);
	float wd = gaus(dst + 1.0, scale);
	float we = gaus(dst + 2.0, scale);
	// Return filtered sample.
	return (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we);
}

// Return scanline weight.
float scan(vec2 pos, float off) {
	float dst = dist(pos).y;
	return gaus(dst + off, sHardScan);
}

// Allow nearest three lines to effect pixel.
vec3 tri(vec2 pos)
{
	vec3 a = horz3(pos, -1.0);
	vec3 b = horz5(pos,  0.0);
	vec3 c = horz3(pos, +1.0);
	float wa = scan(pos, -1.0);
	float wb = scan(pos,  0.0);
	float wc = scan(pos, +1.0);
	return a * wa + b * wb + c * wc;
}

// Distortion of scanlines, and end of screen alpha.
vec2 warp(vec2 pos)
{
	pos = pos * 2.0 - 1.0;
	pos *= vec2(
		1.0 + (pos.y * pos.y) * kWarp.x,
		1.0 + (pos.x * pos.x) * kWarp.y
	);
	return pos * 0.5 + 0.5;
}

// Shadow mask.
vec3 mask(vec2 pos)
{
	pos.x += pos.y * 3.0;
	vec3 mask = vec3(kMaskDark, kMaskDark, kMaskDark);
	pos.x = fract(pos.x / 6.0);
	if (pos.x < 0.333)
		mask.r = kMaskLight;
	else if (pos.x < 0.666)
		mask.g = kMaskLight;
	else
		mask.b = kMaskLight;
	return mask;
}

// Draw dividing bars.
float bar(float pos, float bar) {
	pos -= bar;
	return (pos * pos < 4.0) ? 0.0 : 1.0;
}

float rand(vec2 co) {
	return fract(sin(dot(co.xy , vec2(12.9898, 78.233))) * 43758.5453);
}

// Entry.
void main()
{
//    vec2 pos = warp(gl_FragCoord.xy / resolution.xy);
//    vec2 pos = gl_FragCoord.xy / resolution.xy;
    vec2 pos = o_texcoord;// resolution.xy;
    
	  // Unmodified.
     vec3 c = tri(pos) * mask(gl_FragCoord.xy);
     out_color = vec4(
        toSrgb(vec3(c)),
        1.0
     );
    //out_color = texture(map,o_texcoord);
   //out_color = vec4(1.0,0.0,0.0,1.0);
}
`;

  class Screen {
  constructor(con,texture) {

    const w = con.CONSOLE_WIDTH / window.innerWidth;
    const h = con.CONSOLE_HEIGHT / window.innerHeight;

    this.console = con;
    const gl = this.console.gl;
    const gl2 = this.console.gl2;

    const program = this.program = gl2.createProgram(crtVShader,crtFShader);
    
    this.positionLocation = gl.getAttribLocation(program,'position');
    this.texcoordLocation = gl.getAttribLocation(program,'texcoord');

    // VAOのセットアップ
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Text用ジオメトリのセットアップ //
    // インターリーブ形式
    
    this.bufferData = new Float32Array([
      -w, h,0,0,
      w, h,1,0,
      -w, -h,0,1,
      w, -h,1,1
    ]);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.bufferData, gl.STATIC_DRAW);

    const positionSize = this.positionSize = 2;
    const texcoordSize = this.texcoordSize = 2;
    const stride = this.stride = this.bufferData.BYTES_PER_ELEMENT * (positionSize + texcoordSize);
    const positionOffset = this.positionOffset = 0;
    const texcoordOffset = this.texcoordOffset = positionSize * this.bufferData.BYTES_PER_ELEMENT;

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, positionSize, gl.FLOAT, true, stride, positionOffset);

    gl.enableVertexAttribArray(this.texcoordLocation);
    gl.vertexAttribPointer(this.texcoordLocation, texcoordSize, gl.FLOAT, true, stride, texcoordOffset);

    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2, 1, 2, 3, 1]), gl.STATIC_DRAW);

    gl.bindVertexArray(null);  

    // Uniform変数

    this.mapLocation = gl.getUniformLocation(program,'map');
    this.resolutionLocation = gl.getUniformLocation(program,'resolution');
    this.timeLocation = gl.getUniformLocation(program,'time');
    this.texture = texture;
    this.resolution = [this.console.CONSOLE_WIDTH, this.console.CONSOLE_HEIGHT];

    this.console.on('resize', this.resize.bind(this));
  }

  render() {
    const gl = this.console.gl;
    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
  //  twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.uniform1i(this.mapLocation,0);

    gl.uniform1f(this.timeLocation,0);
    gl.uniform2fv(this.resolutionLocation,this.resolution);

    //twgl.setUniforms(this.programInfo, this.uniforms);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  resize() {
    const con = this.console;
    const w = con.CONSOLE_WIDTH / window.innerWidth;
    const h = con.CONSOLE_HEIGHT / window.innerHeight;
    const gl = this.console.gl;

    this.bufferData = new Float32Array([
      -w, h,0,0,
      w, h,1,0,
      -w, -h,0,1,
      w, -h,1,1
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.bufferData);
    gl.bindBuffer(gl.ARRAY_BUFFER,null);

    this.resolution[0] = this.console.CONSOLE_WIDTH;
    this.resolution[1] = this.console.CONSOLE_HEIGHT;

  }

  }

  //const m4 = twgl.m4;

  class TRS {
    constructor() {
      this.translation = create$4();
      this.rotation = create$4();
      this.scale = fromValues$4(1, 1, 1);
    }

    getMatrix(dst) {
      dst = dst || create$3();
      const t = this.translation;
      const r = this.rotation;
      const s = this.scale;

      // compute a matrix from translation, rotation, and scale
      fromTranslation$2(dst,t);
      scale$3(dst, dst,s);
      rotateX(dst,dst, r[0]);
      rotateY(dst,dst, r[1]);
      rotateZ(dst,dst, r[2]);

      return dst;
    }
  }

  class Node {
    constructor(source = new TRS()) {
      this.children = [];
      this.localMatrix = identity$3(create$3());
      this.worldMatrix = identity$3(create$3());
      this.source = source;
    }

    setParent(parent) {
      // remove us from our parent
      if (this.parent) {
        const ndx = this.parent.children.indexOf(this);
        if (ndx >= 0) {
          this.parent.children.splice(ndx, 1);
        }
      }

      // Add us to our new parent
      if (parent) {
        parent.children.push(this);
      }
      this.parent = parent;
    }

    updateWorldMatrix(matrix) {
      const source = this.source;
      if (source) {
        source.getMatrix(this.localMatrix);
      }

      if (matrix) {
        // a matrix was passed in so do the math
        multiply$3(this.worldMatrix,matrix, this.localMatrix );
      } else {
        // no matrix was passed in so just copy.
        copy$3(this.worldMatrix,this.localMatrix);
      }

      // now process all the children
      const worldMatrix = this.worldMatrix;
      this.children.forEach(function (child) {
        child.updateWorldMatrix(worldMatrix);
      });
    }
  }

  const vs =
    `#version 300 es
precision mediump float;
uniform mat4 u_worldViewProjection;
uniform vec3 u_lightWorldPos;
uniform mat4 u_world;
uniform mat4 u_viewInverse;
//uniform mat4 u_worldInverseTranspose;

in vec3 position;
//in vec3 normal;
in vec2 texcoord;

out vec4 v_position;
out vec2 v_texCoord;
//flat out vec3 v_normal;
out vec3 v_surfaceToLight;
out vec3 v_surfaceToView;

void main() {
  v_texCoord = texcoord;
  vec4 pos = vec4(position,1.0);
  v_position = u_worldViewProjection * pos;
  v_surfaceToLight = u_lightWorldPos - (u_world * pos).xyz;
  v_surfaceToView = (u_viewInverse[3] - (u_world * pos)).xyz;
  gl_Position = v_position;
}
`;

  const fs =
    `#version 300 es
precision mediump float;

in vec4 v_position;
in vec2 v_texCoord;
//flat in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;

//uniform vec4 u_color;
uniform vec4 u_lightColor;
uniform vec4 u_ambient;
uniform vec4 u_diffuse;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;

out vec4 out_color;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              max(l, 0.0),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
}

void main() {
  vec4 diffuseColor = u_diffuse;//texture(u_diffuse, v_texCoord);
  vec3 dx = dFdx(v_position.xyz);
  vec3 dy = dFdy(v_position.xyz);
  vec3 a_normal = normalize(cross(normalize(dx), normalize(dy)));
  //vec3 a_normal = normalize(v_normal);
  vec3 surfaceToLight = normalize(v_surfaceToLight);
  vec3 surfaceToView = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLight + surfaceToView);
  vec4 litR = lit(dot(a_normal, surfaceToLight),
                    dot(a_normal, halfVector), u_shininess);
  vec4 outColor = vec4((
  u_lightColor * (diffuseColor * litR.y + diffuseColor * u_ambient +
                u_specular * litR.z * u_specularFactor) /* * u_color*/).rgb,
      diffuseColor.a);
  out_color = outColor;
}
`;

  class VScreen {
    constructor(con) {
      this.console = con;
      this.gl = con.gl;
      const gl2 = this.gl2 = con.gl2;
      this.y = 0;

      this.scene = new Node();
      this.program = gl2.createProgram(vs, fs);
      this.sceneNodes = [];

      this.uniforms = {
        u_lightWorldPos: fromValues$4(1, 108, 1000),
        u_lightColor: fromValues$5(1.0, 1.0, 1.0, 1),
        u_ambient: fromValues$5(0.2, 0.2, 0.2, 1.0)
      };

      const fov = this.console.ANGLE_OF_VIEW * Math.PI / 180;
      //const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      const aspect = con.VIRTUAL_WIDTH / con.VIRTUAL_HEIGHT;
      const zNear = 0.01;
      const zFar = 100000;
      const projection$$1 = perspective(create$3(), fov, aspect, zNear, zFar);
      const eye = fromValues$4(0, 0, this.console.CAMERA_Z);
      const target = create$4();
      const up = fromValues$4(0, 1, 0);

      const view = lookAt(create$3(), eye, target, up);
      const camera = invert$3(create$3(), view);
      this.uniforms.viewProjection = multiply$3(create$3(), projection$$1, view);

      this.uniforms.u_viewInverse = camera;

    }

    appendScene(sceneNode, parent = this.scene) {
      if (!(sceneNode instanceof Node)) throw new TypeError('');
      sceneNode.setParent(parent);
      this.sceneNodes.push(sceneNode);
    }

    removeScene(sceneNode) {
      {
        const ndx = sceneNode.parent.children.indexOf(sceneNode);
        if (ndx >= 0) {
          sceneNode.parent.children.splice(ndx, 1);
        }
      }
      {
        const ndx = this.sceneNodes.indexOf(sceneNode);
        if (ndx >= 0) {
          this.sceneNodes.splice(ndx, 1);
        }
      }
    }

    render() {

      this.y += 0.006;

      this.scene.updateWorldMatrix();

      this.sceneNodes.forEach(n => {
        if (n.visible) {
          n.render(this);
        }
      });
    }

  }

  var charCodes = 
  [
    // 0x00
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],  
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    // 0x10
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],  
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    // 0x20
    [0x00,0x00],
    [0x61,0x00],
    [0x62,0x00],
    [0x63,0x00],
    [0x64,0x00],
    [0x65,0x00],
    [0x66,0x00],
    [0x67,0x00],  
    [0x68,0x00],
    [0x69,0x00],
    [0x6b,0x00],
    [0x6a,0x00],
    [0x2f,0x00],
    [0x2a,0x00],
    [0x2e,0x00],
    [0x2d,0x00],
    // 0x30
    [0x20,0x00],
    [0x21,0x00],
    [0x22,0x00],
    [0x23,0x00],
    [0x24,0x00],
    [0x25,0x00],
    [0x26,0x00],
    [0x27,0x00],  
    [0x28,0x00],
    [0x29,0x00],
    [0x4f,0x00],
    [0x2c,0x00],
    [0x51,0x00],
    [0x2b,0x00],
    [0x57,0x00],
    [0x49,0x00],
    // 0x40
    [0x55,0x00],
    [0x01,0x00],
    [0x02,0x00],
    [0x03,0x00],
    [0x04,0x00],
    [0x05,0x00],
    [0x06,0x00],
    [0x07,0x00],  
    [0x08,0x00],
    [0x09,0x00],
    [0x0a,0x00],
    [0x0b,0x00],
    [0x0c,0x00],
    [0x0d,0x00],
    [0x0e,0x00],
    [0x0f,0x00],
    // 0x50
    [0x10,0x00],
    [0x11,0x00],
    [0x12,0x00],
    [0x13,0x00],
    [0x14,0x00],
    [0x15,0x00],
    [0x16,0x00],
    [0x17,0x00],  
    [0x18,0x00],
    [0x19,0x00],
    [0x1a,0x00],
    [0x52,0x00],
    [0xdd,0x00],
    [0x54,0x00],
    [0x00,0x00],
    [0x3c,0x00],
    // 0x60
    [0x00,0x00],
    [0x01,0x80],
    [0x02,0x80],
    [0x03,0x80],
    [0x04,0x80],
    [0x05,0x80],
    [0x06,0x80],
    [0x07,0x80],  
    [0x08,0x80],
    [0x09,0x80],
    [0x0a,0x80],
    [0x0b,0x80],
    [0x0c,0x80],
    [0x0d,0x80],
    [0x0e,0x80],
    [0x0f,0x80],
    // 0x7f
    [0x10,0x80],
    [0x11,0x80],
    [0x12,0x80],
    [0x13,0x80],
    [0x14,0x80],
    [0x15,0x80],
    [0x16,0x80],
    [0x17,0x80],  
    [0x18,0x80],
    [0x19,0x80],
    [0x1a,0x80],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00],
    [0x00,0x00]
  ];

  var canaCodes =
  [ 
    // 0xff60
    [0x00,0x00], //
    [0xbd,0x00], // ｡
    [0x9d,0x00], // ｢
    [0xb1,0x00], // ｣
    [0xb5,0x00], // ､
    [0xb9,0x00], // ･
    [0xb4,0x00], // ｦ
    [0x9e,0x00], // ｧ
    [0xb2,0x00], // ｨ
    [0xb6,0x00], // ｩ
    [0xba,0x00], // ｪ
    [0xbe,0x00], // ｫ
    [0x9f,0x00], // ｬ
    [0xb3,0x00], // ｭ
    [0xb7,0x00], // ｮ
    [0xbb,0x00], // ｯ
    
    [0xbf,0x00], // -
    [0xa3,0x00], // ｱ
    [0x85,0x00], // ｲ
    [0xa4,0x00], // ｳ
    [0xa5,0x00], // ｴ
    [0xa6,0x00], // ｵ
    [0x94,0x00], // ｶ
    [0x87,0x00], // ｷ
    [0x88,0x00], // ｸ
    [0x9c,0x00], // ｹ
    [0x82,0x00], // ｺ
    [0x98,0x00], // ｻ
    [0x84,0x00], // ｼ
    [0x92,0x00], // ｽ
    [0x90,0x00], // ｾ
    [0x83,0x00], // ｿ

    [0x91,0x00], // ﾀ
    [0x81,0x00], // ﾁ
    [0x9a,0x00], // ﾂ
    [0x97,0x00], // ﾃ
    [0x93,0x00], // ﾄ
    [0x95,0x00], // ﾅ
    [0x89,0x00], // ﾆ
    [0xa1,0x00], // ﾇ
    [0xaf,0x00], // ﾈ
    [0x8b,0x00], // ﾉ
    [0x86,0x00], // ﾊ
    [0x96,0x00], // ﾋ
    [0xa2,0x00], // ﾌ
    [0xab,0x00], // ﾍ
    [0xaa,0x00], // ﾎ
    [0x8a,0x00], // ﾏ
    
    [0x8e,0x00], // ﾐ
    [0xb0,0x00], // ﾑ
    [0xad,0x00], // ﾒ
    [0x8d,0x00], // ﾓ
    [0xa7,0x00], // ﾔ
    [0xa8,0x00], // ﾕ
    [0xa9,0x00], // ﾖ
    [0x8f,0x00], // ﾗ
    [0x8c,0x00], // ﾘ
    [0xae,0x00], // ﾙ
    [0xac,0x00], // ﾚ
    [0x9b,0x00], // ﾛ
    [0xa0,0x00], // ﾜ
    [0x99,0x00], // ﾝ
    [0xbc,0x00], // ﾞ
    [0xb8,0x00], // ﾟ

  ];

  // かな・全角カナ
  var hiraganaCodes =
  [
    [0x9e,0x00], // 3041 ぁ
    [0xa3,0x00], // 3042 あ
    [0xb2,0x00], // 3043 ぃ
    [0x85,0x00], // 3044 い
    [0xb6,0x00], // 3045 ぅ
    [0xa4,0x00], // 3046 う
    [0xba,0x00], // 3047 ぇ
    [0xa5,0x00], // 3048 え
    [0xbe,0x00], // 3049 ぉ
    [0xa6,0x00], // 304A お
    [0x94,0x00], // 304B か
    [0x94,0xbc], // 304C が
    [0x87,0x00], // 304D き
    [0x87,0xbc], // 304E ぎ
    [0x88,0x00], // 304F く
    [0x88,0xbc], // 3050 ぐ
    [0x9c,0x00], // 3051 け
    [0x9c,0xbc], // 3052 げ
    [0x82,0x00], // 3053 こ
    [0x82,0xbc], // 3054 ご
    [0x98,0x00], // 3055 さ
    [0x98,0xbc], // 3056 ざ
    [0x84,0x00], // 3057 し
    [0x84,0xbc], // 3058 じ
    [0x92,0x00], // 3059 す
    [0x92,0xbc], // 305A ず
    [0x90,0x00], // 305B せ
    [0x90,0xbc], // 305C ぜ
    [0x83,0x00], // 305D そ
    [0x83,0xbc], // 305E ぞ
    [0x91,0x00], // 305F た
    [0x91,0xbc], // 3060 だ
    [0x81,0x00], // 3061 ち
    [0x81,0xbc], // 3062 ぢ
    [0xbb,0x00], // 3063 っ
    [0x9a,0x00], // 3064 つ
    [0x9a,0xbc], // 3065 づ
    [0x97,0x00], // 3066 て
    [0x97,0xbc], // 3067 で
    [0x93,0x00], // 3068 と
    [0x93,0xbc], // 3069 ど
    [0x95,0x00], // 306A な
    [0x89,0x00], // 306B に
    [0xa1,0x00], // 306C ぬ
    [0xaf,0x00], // 306D ね
    [0x8b,0x00], // 306E の
    [0x86,0x00], // 306F は
    [0x86,0xbc], // 3070 ば
    [0x86,0xb8], // 3071 ぱ
    [0x96,0x00], // 3072 ひ
    [0x96,0xbc], // 3073 び
    [0x96,0xb8], // 3074 ぴ
    [0xa2,0x00], // 3075 ふ
    [0xa2,0xbc], // 3076 ぶ
    [0xa2,0xb8], // 3077 ぷ
    [0xab,0x00], // 3078 へ
    [0xab,0xbc], // 3079 べ
    [0xab,0xb8], // 307A ぺ
    [0xaa,0x00], // 307B ほ
    [0xaa,0xbc], // 307C ぼ
    [0xaa,0xb8], // 307D ぽ
    [0x8a,0x00], // 307E ま
    [0x8e,0x00], // 307F み
    [0xb0,0x00], // 3080 む
    [0xad,0x00], // 3081 め
    [0x8d,0x00], // 3082 も
    [0x9f,0x00], // 3083 ゃ
    [0xa7,0x00], // 3084 や
    [0xb3,0x00], // 3085 ゅ
    [0xa8,0x00], // 3086 ゆ
    [0xb7,0x00], // 3087 ょ
    [0xa9,0x00], // 3088 よ
    [0x8f,0x00], // 3089 ら
    [0x8c,0x00], // 308A り
    [0xae,0x00], // 308B る
    [0xac,0x00], // 308C れ
    [0x9b,0x00], // 308D ろ
    [0xa0,0x00], // 308E ゎ
    [0xa0,0x00], // 308F わ
    [0x85,0x00], // 3090 ゐ
    [0xa5,0x00], // 3091 ゑ
    [0xb4,0x00], // 3092 を
    [0x99,0x00], // 3093 ん
    [0xa4,0xbc], // 3094 ゔ
    [0x94,0x00], // 3095 ゕ
    [0x9c,0x00], // 3096 ゖ
    [0xbc,0x00], // 3099 ﾞ
    [0xb8,0x00], // 309A ﾟ
    [0xbc,0x00], // 309B ゛
    [0xbf,0x00], // 309C ゜
    [0x00,0x00], // 309D ゝ
    [0x00,0x00], // 309E ゞ
    [0x00,0x00] // 309F ゟ
  ];

  const vs$1 =
    `#version 300 es
precision highp int;
precision highp float;


in vec2 position;
in vec2 texcoord;
out vec2 vtexcoord;

void main()	{
  gl_Position = vec4( position, 0.0,1.0 );
  vtexcoord = texcoord;
}
`;

  const fs$1 =
    `#version 300 es
precision highp int;
precision highp float;
precision highp usampler2D;

uniform bool blink;
uniform usampler2D textBuffer;
uniform sampler2D font;
uniform sampler2D pallet;
uniform float vwidth;
uniform float vheight;

in vec2 vtexcoord;
out vec4 out_color;

// 文字表示
vec4 textPlane(void){
  // キャラクタコードを読み出し
  ivec2 bpos = ivec2(gl_FragCoord.xy);//ivec2(int(vtexcoord.x * vwidth),int(vtexcoord.y * vheight));
  ivec2 cpos = ivec2(bpos.x >> 3,bpos.y >> 3);

  uint data = texelFetch(textBuffer,cpos,0).r;
  // char codeの内容
  // blink col bg-col alpha code point
  // bccc 0bbb aaaa aaaa pppp pppp pppp pppp  
  uint cc = data & 0xffffu;
  uint attr = data & 0xffff0000u;

  // 表示対象の文字のビット位置を求める
  uint x = 0x80u >> uint( bpos.x & 7);

  // 表示対象の文字のY位置を求める
  int y = bpos.y & 7;
  
  // 文字色
  // uint ccolor = (attr & 0x70u) >> 4u;
  uint ccolor = uint(texelFetch(pallet,ivec2(int((attr & 0x70000000u) >> 28u),0),0).r * 255.0);
  //uint ccolor = 0x7u;
 
  float ccg = float((ccolor & 0x4u) >> 2u) ;// bit 6
  float ccr = float((ccolor & 0x2u) >> 1u);// bit 5
  float ccb = float((ccolor & 0x1u));// bit 4

  // ブリンク
  bool attr_blink = (attr & 0x80000000u) > 0u;// bit 3
  
  // 背景色
  uint bgcolor = uint(texelFetch(pallet,ivec2(int((attr & 0x7000000u) >> 24u),0),0).r * 255.0);

  float bgg = float((bgcolor & 0x4u) >> 2u);// bit 6
  float bgr = float((bgcolor & 0x2u) >> 1u);// bit 5
  float bgb = float((bgcolor & 0x1u));// bit 4

  // フォント読み出し位置
  ivec2 fontpos = ivec2(int(cc & 0xffu),y + int((cc & 0xff00u) >> 5u));
  //vec2 fontpos = vec2(float(cc & 0xffu) / 256.0,float(y + int((cc >> 8u) & 0xffu)) / 2048.0);

  // フォントデータの読み出し
  uint pixByte = uint(texelFetch(font,fontpos,0).r * 256.0);
  //uint pixByte = texture(font,fontpos).r & 0xffu;
  
  // 指定位置のビットが立っているかチェック
  bool pixBit = (pixByte & x) != 0u;

  // blinkの処理
  if(attr_blink && blink) return vec4(0.0);

  if(pixBit){
    // ビットが立っているときは、文字色を設定
    float alpha = float((attr & 0xff0000u) >> 16u) / 255.0;
    return vec4(ccr,ccg,ccb,alpha);
  }

  // ビットが立っていないときは背景色を設定
  float alpha = (bgg + bgr + bgb) == 0.0 ? 0.0 : float((attr & 0xff0000u) >> 16u) / 255.0;
  if(alpha == 0.0) discard;
  return vec4(bgr,bgg,bgb,alpha);
  return vec4(0.0);
}

void main(){
  out_color = textPlane();
}
 
`;

  /// テキストプレーン
  class TextPlane {
    constructor(gl2, vwidth = 320, vheight = 200,textBitmap) {

      this.gl2 = gl2;
      const gl = this.gl = gl2.gl;

      this.charSize = 8;/* 文字サイズ pixel */

      this.vwidth = vwidth;
      this.vheight = vheight;

      this.twidth = vwidth / this.charSize;// テキストの横の文字数
      this.theight = vheight / this.charSize;// テキストの縦の文字数

      this.blinkCount = 0;// ブリンク制御用
      this.blink = false;// ブリンク制御用

      this.textBuffer = new Uint32Array(this.twidth * this.theight);// テキスト/アトリビュートVRAM
      // テスト用
      const s = '０１２３４５６７８９０美咲フォントで表示してみた！ABCDEFGHIJKLMNOPQRSTUVWXYZ!ＡＢＣＤＥＦ漢字もそれなりに表示できる.';
      let si = 0;

      for(let i = 0,e =this.textBuffer.length;i < e;++i){
        const c = ((i & 7) << 28) + ((7 - (i & 7)) << 24) /*+ (((i + (i / this.twidth)) & 1) << 31)*/ + (((i + 0x50) & 0xff ) << 16) ;
        this.textBuffer[i] = s.codePointAt(si++) | c;
        if(si >= s.length){
          si = 0;
        }
      }

      class TextTexture {
        constructor({ location, unitNo = 0, cpubuffer, width, height, internalFormat = gl.R8, format = gl.RED, type = gl.UNSIGNED_BYTE, sampler = null }) {
          this.location = location;
          this.unitNo = unitNo;
          this.width = width;
          this.height = height;
          this.cpubuffer = cpubuffer;
          this.texture = gl.createTexture();
          this.internalFormat = internalFormat;
          this.format = format;
          this.type = type;
          this.sampler = sampler || (() => {
            const s = gl.createSampler();
            gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            return s;
          })();

          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
          gl.bindTexture(gl.TEXTURE_2D, this.texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, cpubuffer);
          gl.bindTexture(gl.TEXTURE_2D, null);
        }

        bind() {
          gl.bindTexture(gl.TEXTURE_2D, this.texture);
        }

        unbind() {
          gl.bindTexture(gl.TEXTURE_2D, null);
        }

        update() {
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, this.format, this.type, this.cpubuffer, 0);
        }

        activate() {
          gl.activeTexture(gl.TEXTURE0 + this.unitNo);
          this.bind();
          gl.bindSampler(this.unitNo, this.sampler);
          gl.uniform1i(this.location, this.unitNo);
        }

      }

      // シェーダーのセットアップ

      // this.programInfo = twgl.createProgramInfo(gl,[vs,fs]);
      const program = this.program = gl2.createProgram(vs$1, fs$1);
      gl.useProgram(program);

      this.positionLocation = gl.getAttribLocation(program, 'position');
      this.texcoordLocation = gl.getAttribLocation(program, 'texcoord');

      // VAOのセットアップ
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      // Text用ジオメトリのセットアップ //
      // インターリーブ形式
      this.bufferData = new Float32Array([
        // pos  texcoord
        -1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        -1.0, -1.0, 0.0, 0.0,
        1.0, -1.0, 1.0, 0.0
      ]);

      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.bufferData, gl.STATIC_DRAW);
      const positionSize = this.positionSize = 2;
      const texcoordSize = this.texcoordSize = 2;
      const stride = this.stride = this.bufferData.BYTES_PER_ELEMENT * (positionSize + texcoordSize);
      const positionOffset = this.positionOffset = 0;
      const texcoordOffset = this.texcoordOffset = positionSize * this.bufferData.BYTES_PER_ELEMENT;

      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, positionSize, gl.FLOAT, true, stride, positionOffset);

      gl.enableVertexAttribArray(this.texcoordLocation);
      gl.vertexAttribPointer(this.texcoordLocation, texcoordSize, gl.FLOAT, true, stride, texcoordOffset);

      this.ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2, 1, 2, 3, 1]), gl.STATIC_DRAW);

      gl.bindVertexArray(null);

      // Uniform変数

      this.blinkLocation = gl.getUniformLocation(program, 'blink');
      this.textBufferLocation = gl.getUniformLocation(program, 'textBuffer');
      this.fontLocation = gl.getUniformLocation(program, 'font');
      this.palletLocation = gl.getUniformLocation(program, 'pallet');
      this.vwidthLocation = gl.getUniformLocation(program, 'vwidth');
      this.vheightLocation = gl.getUniformLocation(program, 'vheight');

      // GPUにテキスト用VRAMを渡すためのテクスチャを作る
      this.textBufferTexture = new TextTexture({
         location: this.textBufferLocation,
         unitNo: 0, 
         cpubuffer: this.textBuffer, 
         width: this.twidth, 
         height: this.theight,
         internalFormat:gl.R32UI, 
         format:gl.RED_INTEGER, 
         type:gl.UNSIGNED_INT

      });

      // フォントのセットアップ
      this.fontTexWidth = 256;//256 * 8
      this.fontTexHeight = textBitmap.length / 256 | 0;
      this.fontBuffer = textBitmap;

      // フォント用テクスチャの生成

      this.textFontTexture = new TextTexture({ location: this.fontLocation, unitNo: 2, cpubuffer: this.fontBuffer, width: this.fontTexWidth, height: this.fontTexHeight });

      // パレットのセットアップ
      this.pallet = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);

      this.palletTexture = new TextTexture({ location: this.palletLocation, unitNo: 3, cpubuffer: this.pallet, width: this.pallet.length, height: 1 });

      this.sy = 0;//描画開始スタート位置

      //this.cls();
    }

    /// 画面消去
    cls() {
      this.textBuffer.fill(0);
      //this.attrBuffer.fill(0);
      this.needsUpdate = true;

    }


    convertStr(str) {
      let attrs = [];
      let chars = [];
      for (let i = 0, e = str.length; i < e; ++i) {
        let code = str.charCodeAt(i);
        // 全角ひらがな
        if (code >= 0x3040 && code < 0x309f) {
          code -= 0x3041;
          const h = hiraganaCodes[code];
          chars.push(h[0]);
          attrs.push(0x80);
          // 濁点など
          if (h[1]) {
            chars.push(h[1]);
            attrs.push(0x80);
          }
        }
        // 全角カタカナ
        else if (code > 0x30A0 && code < 0x30FF) {
          code -= 0x30A1;
          const h = hiraganaCodes[code];
          chars.push(h[0]);
          attrs.push(0x00);
          // 濁点など
          if (h[1]) {
            chars.push(h[1]);
            attrs.push(0x00);
          }
        }
        else if (code >= 0xff60 && code < 0xffa0) {
          code -= 0xff60;
          const kana = canaCodes[code];
          chars.push(kana[0]);
          attrs.push(0);
        } else if (code < 0x80) {
          const ch = charCodes[code];
          chars.push(ch[0]);
          attrs.push(ch[1]);
        } else if (code < 0xff) {
          chars.push(code);
          attrs.push(0);
        }
      }
      return {
        chars: chars,
        attrs: attrs
      };
    }

    print(x, y, str, blink = false, color = 7, bgcolor = 0) {

      let { chars, attrs } = this.convertStr(str);

      if (x == this.CENTER) {
        // センタリング
        x = ((this.twidth - chars.length) / 2 + .5) | 0;
      } else if (x == this.LEFT) {
        // 左寄せ
        x = 0;
      } else if (x == this.RIGHT) {
        // 右寄せ
        x = this.twidth - chars.length;
      }

      let offset = x + y * this.twidth;
      const attr = color << 4 | bgcolor | (blink ? 0x8 : 0);


      for (let i = 0, e = chars.length; i < e; ++i) {

        let code = chars[i];
        if (code == 0xa) {
          y = this.addY(y);
          offset = y * this.twidth;
        }

        this.textBuffer[offset] = chars[i];
        this.attrBuffer[offset] = attr | attrs[i];

        ++offset;
        ++x;
        if (x == this.twidth) {
          x = 0;
          y = this.addY(y);
          offset = x + y * this.twidth;
        }
      }

      this.needsUpdate = true;


    }

    addY(y) {
      ++y;
      if (y == this.theight) {
        this.scroll();
        y = this.theight - 1;
      }
      return y;
    }

    scroll() {
      for (let y = (this.theight - 1) * this.twidth, ey = this.twidth; y > ey; ey += this.twidth) {
        const desty = y - this.twidth;
        for (let x = 0, ex = this.twidth; x < ex; ++x) {
          this.textBuffer[x + desty] = this.textBuffer[x + y];
          this.attrBuffer[x + desty] = this.attrBuffer[x + y];
        }
      }
    }

    fillText(x, y, w, h, str, blink = false, color = 7, bgcolor = 0, fillSpace = true) {

      let { chars, attrs } = this.convertStr(str);

      let end = w * h;

      const attr = color << 4 | bgcolor | (blink ? 0x8 : 0);

      if (fillSpace && chars.length < end) {
        while (chars.length <= end) {
          chars.push(0x00);
          attrs.push(attr);
        }
      }

      let spos = 0;
      end = chars.length;

      let cx = x, cy = y;
      let o = cy * this.twidth;
      while (spos <= end) {
        let code = chars[spos];
        if (code == 0xa) {
          ++cy;
          o = cy * this.twidth;
        } else {
          this.textBuffer[cx + o] = chars[spos];
          this.attrBuffer[cx + o] = attr | attrs[spos];
        }
        ++cx;
        if (cx > (x + w)) {
          cx = x;
          ++cy;
          o = cy * this.twidth;
        }
        ++spos;
      }

      this.needsUpdate = true;

    }

    /// テキストデータをもとにテクスチャーに描画する
    render() {
      const gl = this.gl;
      // const ctx = this.ctx;
      this.blinkCount = (this.blinkCount + 1) & 0xf;
      if (!this.blinkCount) {
        this.blink = !this.blink;
        for(let i = 0;i < 8;++i){
          this.pallet[i] =  (this.pallet[i] + 1) & 7;
        }
        this.needsUpdate = true;
      }
      //this.uniforms.blink = this.blink;
      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);

      if (this.needsUpdate) {
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        this.textBufferTexture.bind();
        this.textBufferTexture.update();
        // this.textAttrTexture.bind();
        // this.textAttrTexture.update();
        this.palletTexture.bind();
        this.palletTexture.update();
        this.textFontTexture.bind();
        this.textFontTexture.update();
        this.palletTexture.unbind();
      }


      gl.uniform1f(this.blinkLocation, this.blink);
      gl.uniform1f(this.vwidthLocation, this.vwidth);
      gl.uniform1f(this.vheightLocation, this.vheight);

      this.textBufferTexture.activate();
  //    this.textAttrTexture.activate();
      this.textFontTexture.activate();
      this.palletTexture.activate();

      // twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
      // twgl.setUniforms(this.programInfo, this.uniforms);

      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(null);
      this.needsUpdate = false;

    }
  }

  TextPlane.prototype.CENTER = Symbol('Center');
  TextPlane.prototype.LEFT = Symbol('LEFT');
  TextPlane.prototype.RIGHT = Symbol('RIGHT');

  class Console extends EventEmitter {
    constructor(virtualWidth = 240 , virtualHeight = 320) {
      super();
      this.VIRTUAL_WIDTH = virtualWidth;
      this.VIRTUAL_HEIGHT = virtualHeight;
      this.CONSOLE_WIDTH = 0;
      this.CONSOLE_HEIGHT = 0;
      this.RENDERER_PRIORITY = 100000 | 0;

      this.ANGLE_OF_VIEW = 45.0;
      this.V_RIGHT = this.VIRTUAL_WIDTH / 2.0;
      this.V_TOP = this.VIRTUAL_HEIGHT / 2.0;
      this.V_LEFT = -1 * this.VIRTUAL_WIDTH / 2.0;
      this.V_BOTTOM = -1 * this.VIRTUAL_HEIGHT / 2.0;
      this.CHAR_SIZE = 8;
      this.TEXT_WIDTH = this.VIRTUAL_WIDTH / this.CHAR_SIZE;
      this.TEXT_HEIGHT = this.VIRTUAL_HEIGHT / this.CHAR_SIZE;
      this.PIXEL_SIZE = 1;
      this.ACTUAL_CHAR_SIZE = this.CHAR_SIZE * this.PIXEL_SIZE;
      this.SPRITE_SIZE_X = 16.0;
      this.SPRITE_SIZE_Y = 16.0;
      this.CAMERA_Z = this.VIRTUAL_HEIGHT / (Math.tan(this.ANGLE_OF_VIEW / 360 * Math.PI) * 2);

      this.scale_ = 1.0;
      this.offset_ = create$4();

      this.renderer = null;
      this.stats = null;
      this.scene = null;
      this.camera = null;
      this.textPlane = null;
      this.position = this.POS_CENTER;
    }

    initConsole(textBitmap) {

      this.gl = document.querySelector('#c').getContext('webgl2');
      const gl = this.gl;
      const gl2 = this.gl2 = new GL2(this.gl);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      
      // this.renderer = new THREE.WebGLRenderer({ antialias: false, sortObjects: true });
      // const renderer = this.renderer;
      this.resize(false);

      // フレームバッファの作成
      const frameBuffer = this.frameBuffer = gl2.createFrameBuffer(this.VIRTUAL_WIDTH,this.VIRTUAL_HEIGHT);
      this.texture = this.frameBuffer.texture;
   
      gl.bindTexture(gl.TEXTURE_2D,this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.bindTexture(gl.TEXTURE_2D, null);

      this.vscreen = new VScreen(this);
      this.text = new TextPlane(gl2,this.VIRTUAL_WIDTH,this.VIRTUAL_HEIGHT,textBitmap);
      this.screen = new Screen(this,this.texture);

      window.addEventListener('resize', this.resize.bind(this));

      // コンソールのセットアップ
    }

    resize(emit = true) {
      this.calcScreenSize();
      this.calcPosition();
      this.gl.canvas.width = this.gl.canvas.clientWidth;
      this.gl.canvas.height = this.gl.canvas.clientHeight;

  //    twgl.resizeCanvasToDisplaySize(this.gl.canvas);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      emit && this.emit('resize', this);
    }

    get position() {
      return this.position_;
    }

    set position(v) {
      if (this.position_ == v) return;
      this.position_ = v;
      this.calcPosition();
    }

    calcPosition() {
      switch (this.position_) {
        case this.POS_CENTER:
          this.offsetX = 0;
          break;
        case this.POS_RIGHT:
          this.offsetX = 1.0 - this.CONSOLE_WIDTH / window.innerWidth * this.scale;
          break;
      }
    }

    initTextPlane() {
      //this.textPlane = new text.TextPlane(this.bufferScene,this.VIRTUAL_WIDTH,this.VIRTUAL_HEIGHT);
    }

    render(time) {

      const gl = this.gl;
      const frameBuffer = this.frameBuffer.frameBuffer;
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,frameBuffer);
      this.gl.viewport(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.clearColor(0,0,0,0.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      this.vscreen.render();
      this.text.render();

      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      
      this.screen.render();
    }

    clear() {
      this.renderer.clear();
    }

    calcScreenSize() {
      let width = window.innerWidth;
      let height = window.innerHeight;
      if (width >= height) {
        width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
        while (width > window.innerWidth) {
          --height;
          width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
        }
      } else {
        height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
        while (height > window.innerHeight) {
          --width;
          height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
        }
      }
      this.CONSOLE_WIDTH = width;
      this.CONSOLE_HEIGHT = height;
    }

    get scale() {
      return this.scale_;
    }

    set scale(v) {
      if (this.scale_ != v) {
        this.scale_ = v;
        this.resize();
      }
    }

    get offsetX() {
      return this.offset_.x;
    }

    set offsetX(v) {
      if (this.offset_.x != v) {
        this.offset_.x = v;
        //this.bufferMesh.position.setX(v);
      }
    }

    get offsetY() {
      return this.offset_.y;
    }

    set offsetY(v) {
      if (this.offset_.y != v) {
        this.offset_.y = v;
        //this.bufferMesh.position.setY(v);
      }
    }
  }

  Console.prototype.POS_CENTER = Symbol('POS_CENTER');
  Console.prototype.POS_RIGHT = Symbol('POS_RIGHT');

  // export function calcScreenSize() {
  //   var width = window.innerWidth;
  //   var height = window.innerHeight;
  //   if (width >= height) {
  //     width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
  //     while (width > window.innerWidth) {
  //       --height;
  //       width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
  //     }
  //   } else {
  //     height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
  //     while (height > window.innerHeight) {
  //       --width;
  //       height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
  //     }
  //   }
  //   this.CONSOLE_WIDTH = width;
  //   this.CONSOLE_HEIGHT = height;
  // }

  const vertexShader = `#version 300 es
precision mediump float;
precision highp int;
/**********************************************

ポイントスプライト利用による2Dスプライト描画

**********************************************/


// 座標 X,Y,Z
in vec3 position;
// XY平面の回転角度（ラジアン）
in float rotate;
// スプライト色 RGBAを8ビットで指定
in uint color;
// セル指定
// CELL_X,CELL_Y,CELL_W,CELL_H(CELL_Hは未使用)
in uint cell_pos_size;
// 16bit目 ... 表示・非表示のフラグ
// 0-15bit ... 拡大縮小(固定小数点8bit.8bit)
in uint attr;// visible,scale

// フラグメント・シェーダーに渡す変数
flat out vec4 v_color;// 色
flat out int v_visible;// 表示・非表示
flat out ivec4 v_cell;// セルの開始位置・削除
flat out vec3  v_rotate;// 回転角度

#define root2 1.414213562

uniform mat4 u_worldViewProjection; // 変換行列
uniform float u_eye_z;// 視点のZ座標

void main() {
  
  // 色情報の取り出し
  v_color = vec4(float(color & 0xffu)/255.0,float((color >> 8) & 0xffu) /255.0,float((color >> 16) & 0xffu) / 255.0,float(color >> 24) / 255.0);
  // 表示情報の取り出し
  v_visible = (attr & 0x00010000u) != 0u ? 1:0;

  // 拡大・縮小情報の取り出し
  float scale = float(attr & 0xffffu) / 256.0;
  // 回転角度の取り出しと、sin/cos値の計算
  v_rotate.x = rotate;
  v_rotate.y = sin(rotate);
  v_rotate.z = cos(rotate);

  // セル位置とセルの幅（大きさ）の取り出し(8px単位で指定)
  // +-------------------------------------------------------------+
  // +                                                             +
  // +       (v_cell.x,v_cell.y)                                   +
  // +             *----------+                                    +
  // +             +----------+                                    +
  // +             +----------+                                    +
  // +             +----------*                                    +
  // +                   (v_cell.x + v_cell.z,v_cell.y + v_cell.z) +
  // +                                                             +
  // +                                                             +
  // +                                                             +
  // +-------------------------------------------------------------+
  v_cell.x = int((cell_pos_size << 3u) & 0x7f8u);// x
  v_cell.y = int((cell_pos_size >> 5u) & 0x7f8u);// y
  v_cell.z = int((cell_pos_size >> 13u) & 0x7f8u);// width

  // 表示位置の計算
  vec4 pos = u_worldViewProjection * vec4(position,1.0);
  gl_Position = pos;
  float cell_w = float(v_cell.z) * scale;

  // セルサイズを計算
  // ルート2倍するのは、回転を考慮しているため
  gl_PointSize = clamp((-cell_w / u_eye_z * pos.z + cell_w) * root2,1.,128.);

}
`;

  const fragmentShader = `#version 300 es
precision mediump float;
precision highp int;

// テクスチャ・サンプラ
uniform sampler2D u_texture;

// 頂点シェーダーからの情報
flat in vec4 v_color;// スプライト色
flat in int v_visible;// 表示
flat in ivec4 v_cell;// セルの座標位置・幅（大きさ）
flat in vec3  v_rotate;// 回転角度


#define root2 1.414213562

// 出力色
out vec4 fcolor;

void main() {

  // 表示フラグのチェック
  if(v_visible == 0) discard;

  // 中心点が0.0になるようにcoordを調整する
  vec2 coord = gl_PointCoord - 0.5;
  // ルート2倍する
  coord *= root2;

  // Z軸で回転（XY平面で回転）
  float s = v_rotate.y;
  float c = v_rotate.z;

  vec2 coord2 = vec2(
    coord.x * c - coord.y * s,
    coord.x * s + coord.y * c
  );
  
  // 回転の結果はみ出た部分は描画しない
  if(coord2.x < -0.5 || coord2.x > 0.5 || coord2.y < -0.5 || coord2.y > 0.5) {
    //fcolor = vec4(1.0,0.0,0.0,0.8);
    discard;
  }
  // 中心点をもとに戻す
  coord = coord2 + 0.5;

  // セル幅
  float w = float(v_cell.z);

  // 指定位置・幅でテクスチャをフェッチする
  fcolor = texelFetch(u_texture,ivec2(v_cell.x + int(w * coord.x) ,v_cell.y + int(-w * coord.y)),0) * v_color;

  // αが0の場合描画しない（カラーキーのかわり）
  if(fcolor.a == 0.0) discard;

}
`;

  // プログラムを使いまわすためのキャッシュ
  let programCache;

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


  // スプライトバッファ
  class SpriteBuffer {
    constructor(amount) {
      // Strideの計算
      this.stride = Float32Array.BYTES_PER_ELEMENT * (3 + 1) + Uint32Array.BYTES_PER_ELEMENT * (1 + 1 + 1);
      // スプライトの枚数
      this.amount = amount;
      // バッファの生成
      this.buffer = new ArrayBuffer(amount * this.stride);
      // DataView
      this.view = new DataView(this.buffer);
      // エンディアンのチェック
      this.littleEndian = checkEndian(this.buffer);

      // 表示フラグの初期化
      for (let i = 0, e = this.amount; i < e; ++i) {
        this.setVisible(i, false);
      }

    }

    // 位置ビューの取得
    getPosition(i) {
      return new Float32Array(this.buffer, this.stride * i, 3);
    }

    // 回転角度の取得
    getRotate(i) {
      return this.view.getFloat32(this.stride * i + this.ROTATE_OFFSET, this.littleEndian);
    }

    // 回転角度の設定
    setRotate(i,v) {
      return this.view.setFloat32(this.stride * i + this.ROTATE_OFFSET,v, this.littleEndian);
    }

    // 色情報ビューの取得
    getColor(i) {
      return new Uint8ClampedArray(this.buffer, this.stride * i + this.COLOR_OFFSET, 4);
    }

    // 表示・非表示フラグ状態の取得
    getVisible(i) {
      return this.view.getUint32(this.stride * i + this.ATTRIBUTE_OFFSET, this.littleEndian) & 0x00010000;
    }

    // 表示・非表示フラグ状態の設定
    setVisible(i, v) {
      const o = this.stride * i + this.ATTRIBUTE_OFFSET;
      let va = this.view.getUint32(o, this.littleEndian);
      v ?
        this.view.setUint32(this.stride * i + this.ATTRIBUTE_OFFSET, va | 0x00010000, this.littleEndian)
        : this.view.setUint32(this.stride * i + this.ATTRIBUTE_OFFSET, va & 0xfffeffff, this.littleEndian);
    }

    // 拡大・縮小率の取得
    getScale(i) {
      return (this.view.getUint32(this.stride * i + this.ATTRIBUTE_OFFSET, this.littleEndian) & 0xffff) ;
    }

    // 拡大・縮小率の設定
    setScale(i, v) {
      const vb = v * 256.0 & 0xffff;
      const o = this.stride * i + this.ATTRIBUTE_OFFSET;
      let va = (this.view.getUint32(o, this.littleEndian) & 0x00010000) | vb;
      this.view.setUint32(o, va, this.littleEndian);
    }

    // セル位置・セル幅（大きさ）情報の取得
    getCellPosSize(i) {
      return new Uint8Array(this.buffer, this.stride * i + this.CELL_OFFSET, 4);
    }

  }

  // 各バッファ属性のサイズ
  SpriteBuffer.prototype.POSITION_SIZE = 3;// 位置
  SpriteBuffer.prototype.ROTATE_SIZE = 1;// 回転角度
  SpriteBuffer.prototype.COLOR_SIZE = 4;// スプライト色
  SpriteBuffer.prototype.CELL_SIZE = 4;//セルの位置、幅指定
  SpriteBuffer.prototype.ATTRIBUTE_SIZE = 1;// 拡大縮小・非表示属性
  // 各バッファ属性のオフセット
  SpriteBuffer.prototype.POSITION_OFFSET = 0;
  SpriteBuffer.prototype.ROTATE_OFFSET = SpriteBuffer.prototype.POSITION_SIZE * Float32Array.BYTES_PER_ELEMENT;
  SpriteBuffer.prototype.COLOR_OFFSET = SpriteBuffer.prototype.ROTATE_OFFSET + SpriteBuffer.prototype.ROTATE_SIZE * Float32Array.BYTES_PER_ELEMENT;
  SpriteBuffer.prototype.CELL_OFFSET = SpriteBuffer.prototype.COLOR_OFFSET + SpriteBuffer.prototype.COLOR_SIZE * Uint8Array.BYTES_PER_ELEMENT;
  SpriteBuffer.prototype.ATTRIBUTE_OFFSET = SpriteBuffer.prototype.CELL_OFFSET + SpriteBuffer.prototype.CELL_SIZE * Uint8Array.BYTES_PER_ELEMENT;

  // ポイントスプライトを使用したスプライト画面クラス
  class Sprite extends Node {
    constructor({ gl2, texture,  amount = 1024, visible = true }) {
      super();

      // スプライト面の表示・非表示
      this.visible = visible;

      // webgl コンテキストの保存
      const gl = this.gl = gl2.gl;
      this.gl2 = gl2;

      // スプライトバッファの作成
      this.spriteBuffer = new SpriteBuffer(amount);

      // テクスチャの保存
      this.texture = texture;

      // プログラムの生成
      if (!programCache) {
        programCache = gl2.createProgram(vertexShader, fragmentShader);
      }
      const program = this.program = programCache;

      // アトリビュート
      // VAOの生成とバインド
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      // VBOの生成
      this.buffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      // VBOにスプライトバッファの内容を転送
      gl.bufferData(gl.ARRAY_BUFFER, this.spriteBuffer.buffer, gl.DYNAMIC_DRAW);

      // 属性ロケーションIDの取得と保存
      this.positionLocation = gl.getAttribLocation(program, 'position');
      this.rotateLocation = gl.getAttribLocation(program, 'rotate');
      this.colorLocation = gl.getAttribLocation(program, 'color');
      this.cellPosSizeLocation = gl.getAttribLocation(program, 'cell_pos_size');
      this.attributeLocation = gl.getAttribLocation(program, 'attr');

      this.stride = this.spriteBuffer.stride;

      // 属性の有効化とシェーダー属性とバッファ位置の結び付け
      // 位置
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, this.spriteBuffer.POSITION_SIZE, gl.FLOAT, true, this.stride, this.spriteBuffer.POSITION_OFFSET);
      
      // 回転角度 
      gl.enableVertexAttribArray(this.rotateLocation);
      gl.vertexAttribPointer(this.rotateLocation, this.spriteBuffer.ROTATE_SIZE, gl.FLOAT, true, this.stride, this.spriteBuffer.ROTATE_OFFSET);

      // スプライト色
      gl.enableVertexAttribArray(this.colorLocation);
      gl.vertexAttribIPointer(this.colorLocation, this.spriteBuffer.COLOR_SIZE / 4, gl.UNSIGNED_INT, this.stride, this.spriteBuffer.COLOR_OFFSET);

      // テクスチャのセルの位置および幅
      gl.enableVertexAttribArray(this.cellPosSizeLocation);
      gl.vertexAttribIPointer(this.cellPosSizeLocation, this.spriteBuffer.CELL_SIZE / 4, gl.UNSIGNED_INT, this.stride, this.spriteBuffer.CELL_OFFSET);

      // 拡大・縮小スケーリングとスプライトの表示・非表示フラグ 
      gl.enableVertexAttribArray(this.attributeLocation);
      gl.vertexAttribIPointer(this.attributeLocation, this.spriteBuffer.ATTRIBUTE_SIZE, gl.UNSIGNED_INT, this.stride, this.spriteBuffer.ATTRIBUTE_OFFSET);

      gl.bindVertexArray(null);

      // uniform変数の位置の取得と保存

      // ワールド・ビュー変換行列
      this.viewProjectionLocation = gl.getUniformLocation(program, 'u_worldViewProjection');
      // 視点のZ位置
      this.eyeZLocation = gl.getUniformLocation(program, 'u_eye_z');
      // テクスチャ
      this.textureLocation = gl.getUniformLocation(program, 'u_texture');
      // ビュー・投影行列
      this.viewProjection = create$3();
    }

    // スプライトを描画
    render(screen) {
      const gl = this.gl;

      // プログラムの指定
      gl.useProgram(this.program);

      // SpriteBufferの内容を更新
      gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.spriteBuffer.buffer);

      // VAOをバインド
      gl.bindVertexArray(this.vao);

      // uniform変数を更新
      gl.uniformMatrix4fv(this.viewProjectionLocation, false, multiply$3(this.viewProjection, screen.uniforms.viewProjection, this.worldMatrix));
      gl.uniform1f(this.eyeZLocation, screen.console.CAMERA_Z);

      // テクスチャの有効化とバインド
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      //gl.disable(gl.DEPTH_TEST);
      // 描画命令の発行
      gl.drawArrays(gl.POINTS, 0, this.spriteBuffer.amount);

    }

  }

  // let display = true;
  let play = false;

  window.addEventListener('load',()=>{

    let playButton = document.getElementById('playbutton');
    playButton.addEventListener('click',function(){

      //if(display){
        //play = !play;
        if(!play){
          playButton.setAttribute('class','hidden');
          //playButton.innerHTML = 'stop';
          play = true;
          //display = false;
          start();
        }
        // } else {
        //   playButton.setAttribute('class','active');
        //   playButton.innerHTML = 'play';
        // }
      //} else {
      //  playButton.setAttribute('class','active1');
      //  display = true;
      //}    
    });
   
  });

  async function start(){
    const con = new Console(160,100);

    const textBitmap = new Uint8Array(
      await fetch('./font.bin')
        .then(r=>r.arrayBuffer()));

    con.initConsole(textBitmap);
    const gl = con.gl;
    const gl2 = con.gl2;

    const spriteImg = await gl2.loadImage('./enemy.png');

    const spriteTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, spriteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteImg);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const sprite = new Sprite({gl2:gl2,texture:spriteTexture,amount:8 * 8 * 8});
    initSprite(sprite);

    con.vscreen.appendScene(sprite);
    
    // WebAssembly.instantiateStreaming(fetch("./wa/test.wasm"),exportToWasm).then(mod => {
    //   const test = mod.instance.exports.test;
    //   mem = new DataView(mod.instance.exports.memory.buffer);
    //   test();
    // });

    let time = 0;
    function main(){
        time += 0.02;
        // cube.source.rotation[1] = time;
        // cube2.source.rotation[2] = time;
        sprite.source.rotation[0] = time/2;
        sprite.source.translation[2] = 60.0;
        sprite.source.rotation[1] = time/2;
        //con.text.print(0,0,'WebGL2 Point Sprite ｦﾂｶｯﾀ Spriteﾋｮｳｼﾞ TEST',true,7,1);

        con.render(time);
        const spriteBuffer = sprite.spriteBuffer;
        for(let i = 0;i < 512;++i){
          const sgn = i & 1 ? -1 : 1; 
          spriteBuffer.setRotate(i,sgn * time * 2);
        }
        requestAnimationFrame(main);
    }
    main();
  }

  function initSprite(sprite){
    const spriteBuffer = sprite.spriteBuffer;
    const cellSize = 24;
    let idx = 0;
    //let z = 320;
    for(let z = -cellSize * 4 ,ez = cellSize * 4 ;z < ez;z += cellSize ){
      for(let y = -cellSize * 4,ey = cellSize * 4;y < ey;y += cellSize){
        for(let x = -cellSize * 4,ex = cellSize * 4;x < ex;x += cellSize){
          const pos = spriteBuffer.getPosition(idx);
          pos[0] = x;pos[1] = y;pos[2] = z;
          const color = spriteBuffer.getColor(idx);
          color[0] = color[1] = color[2] = color[3] = 0xff;
          spriteBuffer.setVisible(idx,true);
          spriteBuffer.setScale(idx,3);
          const cellPosSize = spriteBuffer.getCellPosSize(idx);
          cellPosSize[0] = 0 + (idx & 3) * 2;// x
          cellPosSize[1] = 4;// y
          cellPosSize[2] = 2;// * 8 = 32px: width
          cellPosSize[3] = 2;// don't use
          ++idx;
        }
      }
    }
  }

}());
