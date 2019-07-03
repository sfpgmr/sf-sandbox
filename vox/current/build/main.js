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
  function create() {
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
  function create$1() {
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
  function copy(out, a) {
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
  function identity(out) {
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
  function invert(out, a) {
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
  function multiply(out, a, b) {
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
  function scale(out, a, v) {
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
  function fromTranslation(out, v) {
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
      return identity(out);
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
  function create$2() {
    let out = new ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }

  /**
   * Creates a new vec3 initialized with values from an existing vector
   *
   * @param {vec3} a vector to clone
   * @returns {vec3} a new 3D vector
   */
  function clone(a) {
    var out = new ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
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
  function fromValues(x, y, z) {
    let out = new ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }

  /**
   * Set the components of a vec3 to the given values
   *
   * @param {vec3} out the receiving vector
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @returns {vec3} out
   */
  function set(out, x, y, z) {
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
    let vec = create$2();

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
  function create$3() {
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
  function fromValues$1(x, y, z, w) {
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
    let vec = create$3();

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
  function create$4() {
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
    let tmpvec3 = create$2();
    let xUnitVec3 = fromValues(1,0,0);
    let yUnitVec3 = fromValues(0,1,0);

    return function(out, a, b) {
      let dot$1 = dot(a, b);
      if (dot$1 < -0.999999) {
        cross(tmpvec3, xUnitVec3, a);
        if (len(tmpvec3) < 0.000001)
          cross(tmpvec3, yUnitVec3, a);
        normalize(tmpvec3, tmpvec3);
        setAxisAngle(out, tmpvec3, Math.PI);
        return out;
      } else if (dot$1 > 0.999999) {
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
        out[3] = 1 + dot$1;
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
    let temp1 = create$4();
    let temp2 = create$4();

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
    let matr = create();

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
  function create$5() {
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
    let vec = create$5();

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
    out_color = vec4(texture(map,o_texcoord).rgb,1.0);
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
      this.translation = create$2();
      this.rotation = create$2();
      this.scale = fromValues(1, 1, 1);
    }

    getMatrix(dst) {
      dst = dst || create$1();
      const t = this.translation;
      const r = this.rotation;
      const s = this.scale;

      // compute a matrix from translation, rotation, and scale
      fromTranslation(dst,t);
      scale(dst, dst,s);
      rotateX(dst,dst, r[0]);
      rotateY(dst,dst, r[1]);
      rotateZ(dst,dst, r[2]);

      return dst;
    }
  }

  class Node {
    constructor(source = new TRS()) {
      this.children = [];
      this.localMatrix = identity(create$1());
      this.worldMatrix = identity(create$1());
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
        multiply(this.worldMatrix,matrix, this.localMatrix );
      } else {
        // no matrix was passed in so just copy.
        copy(this.worldMatrix,this.localMatrix);
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
        u_lightWorldPos: fromValues(1, 108, 1000),
        u_lightColor: fromValues$1(1.0, 1.0, 1.0, 1),
        u_ambient: fromValues$1(0.2, 0.2, 0.2, 1.0)
      };

      const fov = this.console.ANGLE_OF_VIEW * Math.PI / 180;
      //const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      const aspect = con.VIRTUAL_WIDTH / con.VIRTUAL_HEIGHT;
      const zNear = 0.01;
      const zFar = 100000;
      const projection = perspective(create$1(), fov, aspect, zNear, zFar);
      const eye = fromValues(0, 0, this.console.CAMERA_Z);
      const target = create$2();
      const up = fromValues(0, 1, 0);

      const view = lookAt(create$1(), eye, target, up);
      const camera = invert(create$1(), view);
      this.uniforms.viewProjection = multiply(create$1(), projection, view);

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
uniform usampler2D font;
uniform usampler2D pallet;
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
  uint ccolor = texelFetch(pallet,ivec2(int((attr & 0x70000000u) >> 28u),0),0).r;
  //uint ccolor = 0x7u;
 
  float ccg = float((ccolor & 0x4u) >> 2u) ;// bit 6
  float ccr = float((ccolor & 0x2u) >> 1u);// bit 5
  float ccb = float((ccolor & 0x1u));// bit 4

  // ブリンク
  bool attr_blink = (attr & 0x80000000u) > 0u;// bit 3
  
  // 背景色
  uint bgcolor = texelFetch(pallet,ivec2(int((attr & 0x7000000u) >> 24u),0),0).r;

  float bgg = float((bgcolor & 0x4u) >> 2u);// bit 6
  float bgr = float((bgcolor & 0x2u) >> 1u);// bit 5
  float bgb = float((bgcolor & 0x1u));// bit 4

  // フォント読み出し位置
  ivec2 fontpos = ivec2(int(cc & 0xffu),y + int((cc & 0xff00u) >> 5u));
  //vec2 fontpos = vec2(float(cc & 0xffu) / 256.0,float(y + int((cc >> 8u) & 0xffu)) / 2048.0);

  // フォントデータの読み出し
  uint pixByte = texelFetch(font,fontpos,0).r;
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
      // const s = '０１２３４５６７８９０美咲フォントで表示してみた！ABCDEFGHIJKLMNOPQRSTUVWXYZ!ＡＢＣＤＥＦ漢字もそれなりに表示できる.';
      // let si = 0;

      // for(let i = 0,e =this.textBuffer.length;i < e;++i){
      //   const c = ((i & 7) << 28) + ((7 - (i & 7)) << 24) /*+ (((i + (i / this.twidth)) & 1) << 31)*/ + (((i + 0x50) & 0xff ) << 16) ;
      //   this.textBuffer[i] = s.codePointAt(si++) | c;
      //   if(si >= s.length){
      //     si = 0;
      //   }
      // }

      class TextTexture {
        constructor({ location, unitNo = 0, cpubuffer, width, height, internalFormat = gl.R8UI, format = gl.RED_INTEGER, type = gl.UNSIGNED_BYTE, sampler = null }) {
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
      this.needsUpdate = true;
    }

    // print(x, y, str, blink = false, color = 7, bgcolor = 0) {

    //   let { chars, attrs } = this.convertStr(str);

    //   if (x == this.CENTER) {
    //     // センタリング
    //     x = ((this.twidth - chars.length) / 2 + .5) | 0;
    //   } else if (x == this.LEFT) {
    //     // 左寄せ
    //     x = 0;
    //   } else if (x == this.RIGHT) {
    //     // 右寄せ
    //     x = this.twidth - chars.length;
    //   }

    //   let offset = x + y * this.twidth;
    //   const attr = color << 4 | bgcolor | (blink ? 0x8 : 0);


    //   for (let i = 0, e = chars.length; i < e; ++i) {

    //     let code = chars[i];
    //     if (code == 0xa) {
    //       y = this.addY(y);
    //       offset = y * this.twidth;
    //     }

    //     this.textBuffer[offset] = chars[i];
    //     this.attrBuffer[offset] = attr | attrs[i];

    //     ++offset;
    //     ++x;
    //     if (x == this.twidth) {
    //       x = 0;
    //       y = this.addY(y);
    //       offset = x + y * this.twidth;
    //     }
    //   }

    //   this.needsUpdate = true;


    // }

    // addY(y) {
    //   ++y;
    //   if (y == this.theight) {
    //     this.scroll();
    //     y = this.theight - 1;
    //   }
    //   return y;
    // }

    // scroll() {
    //   for (let y = (this.theight - 1) * this.twidth, ey = this.twidth; y > ey; ey += this.twidth) {
    //     const desty = y - this.twidth;
    //     for (let x = 0, ex = this.twidth; x < ex; ++x) {
    //       this.textBuffer[x + desty] = this.textBuffer[x + y];
    //       this.attrBuffer[x + desty] = this.attrBuffer[x + y];
    //     }
    //   }
    // }

    // fillText(x, y, w, h, str, blink = false, color = 7, bgcolor = 0, fillSpace = true) {

    //   let { chars, attrs } = this.convertStr(str);

    //   let end = w * h;

    //   const attr = color << 4 | bgcolor | (blink ? 0x8 : 0);

    //   if (fillSpace && chars.length < end) {
    //     while (chars.length <= end) {
    //       chars.push(0x00);
    //       attrs.push(attr);
    //     }
    //   }

    //   let spos = 0;
    //   end = chars.length;

    //   let cx = x, cy = y;
    //   let o = cy * this.twidth;
    //   while (spos <= end) {
    //     let code = chars[spos];
    //     if (code == 0xa) {
    //       ++cy;
    //       o = cy * this.twidth;
    //     } else {
    //       this.textBuffer[cx + o] = chars[spos];
    //       this.attrBuffer[cx + o] = attr | attrs[spos];
    //     }
    //     ++cx;
    //     if (cx > (x + w)) {
    //       cx = x;
    //       ++cy;
    //       o = cy * this.twidth;
    //     }
    //     ++spos;
    //   }

    //   this.needsUpdate = true;

    // }

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
      this.offset_ = create$2();

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
      gl.depthFunc(gl.LEQUAL);
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

  /*
   * vox.js 1.1.0-beta
   * https://github.com/daishihmr/vox.js
   * 
   * The MIT License (MIT)
   * Copyright © 2015, 2016 daishi_hmr, dev7.jp
   * 
   * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
   * associated documentation files (the “Software”), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
   * of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following
   * conditions:
   * 
   * The above copyright notice and this permission notice shall be included in all copies or substantial portions
   * of the Software.
   * 
   * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /**
   * @namespace
   */
  const vox = {};

  (function() {
      if (typeof(window) !== "undefined") {
          vox.global = window;
          vox.global.vox = vox;
      } else {
          vox.global = global;
      }

      if (typeof(module) !== "undefined") {
          module.exports = vox;
      }

  })();

  (function() {

      /**
       * @constructor
       * @property {Object} size {x, y, z}
       * @property {Array} voxels [{x, y, z, colorIndex}...]
       * @property {Array} palette [{r, g, b, a}...]
       */
      vox.VoxelData = function() {
          this.size = null;
          this.voxels = [];
          this.palette = [];
          
          this.anim = [{
              size: null,
              voxels: [],
          }];
      };
      
  })();

  (function() {
      
      vox.Xhr = function() {};
      vox.Xhr.prototype.getBinary = function(url) {
          return new Promise(function(resolve, reject) {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, true);
              xhr.responseType = "arraybuffer";
              xhr.onreadystatechange = function() {
                  if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
                      var arrayBuffer = xhr.response;
                      if (arrayBuffer) {
                          var byteArray = new Uint8Array(arrayBuffer);
                          resolve(byteArray);
                      }
                  }
              };
              xhr.send(null);
          });
      };
      
  })();

  (function() {
      /** 
       * @constructor
       */
      vox.Parser = function() {};
      
      /**
       * 戻り値のPromiseは成功すると{@link vox.VoxelData}を返す.
       * @param {String} url
       * @return {Promise}
       */
      vox.Parser.prototype.parse = function(url) {
          var self = this;
          var xhr = new vox.Xhr();
          return xhr.getBinary(url).then(function(uint8Array) {
              return new Promise(function(resolve, reject) {
                  self.parseUint8Array(uint8Array, function(error, voxelData) {
                      if (error) {
                          reject(error);
                      } else {
                          resolve(voxelData);
                      }
                  });
              });
          });
      };

      if (typeof(require) !== "undefined") {
          var fs = require("fs");
          /**
           * for node.js
           * @param {String} path
           * @param {function} callback
           */
          vox.Parser.prototype.parseFile = function(path, callback) {
              fs.readFile(path, function(error, data) {
                  if (error) {
                      return callback(error);
                  } else {
                      var uint8Array = new Uint8Array(new ArrayBuffer(data.length));
                      for (var i = 0, len = data.length; i < len; i++) {
                          uint8Array[i] = data[i];
                      }
                      this.parseUint8Array(uint8Array, callback);
                  }
              }.bind(this));
          };
      }
      
      /**
       * @param {Uint8Array} uint8Array
       * @param {function} callback
       */
      vox.Parser.prototype.parseUint8Array = function(uint8Array, callback) {
          var dataHolder = new DataHolder(uint8Array);
          try {
              root(dataHolder);
              dataHolder.data.size = dataHolder.data.anim[0].size;
              dataHolder.data.voxels = dataHolder.data.anim[0].voxels;
              if (dataHolder.data.palette.length === 0) {
                  dataHolder.data.palette = vox.defaultPalette;
              } else {
                  dataHolder.data.palette.unshift(dataHolder.data.palette[0]);
                  dataHolder.data.palette.pop();
              }

              callback(null, dataHolder.data);
          } catch (e) {
              callback(e);
          }
      };
      
      var DataHolder = function(uint8Array) {
          this.uint8Array = uint8Array;
          this.cursor = 0;
          this.data = new vox.VoxelData();

          this._arrayArray = [];
          this._cursorArray = [];
      };
      DataHolder.prototype.next = function() {
          if (this.uint8Array.byteLength <= this.cursor) {
              throw new Error("uint8Array index out of bounds: " + this.uint8Array.byteLength);
          }
          return this.uint8Array[this.cursor++];
      };
      DataHolder.prototype.hasNext = function() {
          return this.cursor < this.uint8Array.byteLength;
      };
      DataHolder.prototype.push = function(chunkSize) {
          var array = new Uint8Array(chunkSize);
          for (var i = 0; i < array.length; i++) {
              array[i] = this.next();
          }

          this._arrayArray.push(this.uint8Array);
          this._cursorArray.push(this.cursor);

          this.uint8Array = array;
          this.cursor = 0;
      };
      DataHolder.prototype.pop = function() {
          this.uint8Array = this._arrayArray.pop();
          this.cursor = this._cursorArray.pop();
      };
      DataHolder.prototype.parseInt32 = function() {
          var intValue = 0;
          for (var i = 0; i < 4; i++) {
              intValue += this.next() * Math.pow(256, i);
          }
          // unsigned to signed
          return ~~intValue;
      };
      DataHolder.prototype.parseString = function() {
          var n = this.parseInt32();
          var str = "";
          for (var i = 0; i < n; i++) {
              str += String.fromCharCode(this.next());
          }
          return str;
      };
      DataHolder.prototype.parseDict = function() {
          var n = this.parseInt32();
          // debugLog("    dict num of pair = " + n);
          var dict = {};
          for (var i = 0; i < n; i++) {
              var key = this.parseString();
              var value = this.parseString();
              dict[key] = value;
          }
          return dict;
      };
      DataHolder.prototype.parseRotation = function() {
          var bytes = this.next();
      };

      var root = function(dataHolder) {
          parseMagicNumber(dataHolder);
          parseVersionNumber(dataHolder);
          parseChunk(dataHolder); // main chunk
      };
      
      var parseMagicNumber = function(dataHolder) {
          var str = "";
          for (var i = 0; i < 4; i++) {
              str += String.fromCharCode(dataHolder.next());
          }
          
          if (str !== "VOX ") {
              throw new Error("invalid magic number '" + str + "'");
          }
      };
      
      var parseVersionNumber = function(dataHolder) {
          var ver = dataHolder.parseInt32();
          console.info(".vox format version " + ver);
      };
      
      var parseChunk = function(dataHolder) {
          if (!dataHolder.hasNext()) return false;

          var chunkId = parseChunkId(dataHolder);
          var chunkSize = parseSizeOfChunkContents(dataHolder);
          parseTotalSizeOfChildrenChunks(dataHolder);
          parseContents(chunkId, chunkSize, dataHolder);
          while (parseChunk(dataHolder));
          return dataHolder.hasNext();
      };
      
      var parseChunkId = function(dataHolder) {
          var id = "";
          for (var i = 0; i < 4; i++) {
              id += String.fromCharCode(dataHolder.next());
          }
          return id;
      };
      
      var parseSizeOfChunkContents = function(dataHolder) {
          var size = dataHolder.parseInt32();
          // debugLog("  size of chunk = " + size);
          return size;
      };
      
      var parseTotalSizeOfChildrenChunks = function(dataHolder) {
          var size = dataHolder.parseInt32();
      };

      var parseContents = function(chunkId, chunkSize, dataHolder) {
          dataHolder.push(chunkSize);

          switch (chunkId) {
          case "PACK":
              contentsOfPackChunk(dataHolder);
              break;
          case "SIZE":
              contentsOfSizeChunk(dataHolder);
              break;
          case "XYZI":
              contentsOfVoxelChunk(dataHolder);
              break;
          case "RGBA":
              contentsOfPaletteChunk(dataHolder);
              break;
          case "MATT":
              contentsOfMaterialChunk(dataHolder);
              break;
          case "nTRN":
              contentsOfTransformNodeChunk(dataHolder);
              break;
          case "nGRP":
              contentsOfGroupNodeChunk(dataHolder);
              break;
          case "nSHP":
              contentsOfShapeNodeChunk(dataHolder);
              break;
          case "MATL":
              contentsOfMaterialExChunk(dataHolder);
              break;
          default:
              break;
          }

          dataHolder.pop();
      };
      
      var contentsOfPackChunk = function(dataHolder) {
          var size = dataHolder.parseInt32();
      };
      
      var contentsOfSizeChunk = function(dataHolder) {
          var x = dataHolder.parseInt32();
          var y = dataHolder.parseInt32();
          var z = dataHolder.parseInt32();

          var data = dataHolder.data.anim[dataHolder.data.anim.length - 1];
          if (data.size) {
              data = { size: null, voxels: [] };
              dataHolder.data.anim.push(data);
          }
          data.size = {
              x: x,
              y: y,
              z: z,
          };
      };
      
      var contentsOfVoxelChunk = function(dataHolder) {
          var num = dataHolder.parseInt32();

          var data = dataHolder.data.anim[dataHolder.data.anim.length - 1];
          if (data.voxels.length) {
              data = { size: null, voxels: [] };
              dataHolder.data.anim.push(data);
          }
          for (var i = 0; i < num; i++) {
              data.voxels.push({
                  x: dataHolder.next(),
                  y: dataHolder.next(),
                  z: dataHolder.next(),
                  colorIndex: dataHolder.next(),
              });
          }
      };

      var contentsOfPaletteChunk = function(dataHolder) {
          for (var i = 0; i < 256; i++) {
              var p = {
                  r: dataHolder.next(),
                  g: dataHolder.next(),
                  b: dataHolder.next(),
                  a: dataHolder.next(),
              };
              dataHolder.data.palette.push(p);
          }
      };
      
      var contentsOfMaterialChunk = function(dataHolder) {
          var id = dataHolder.parseInt32();

          var type = dataHolder.parseInt32();

          var weight = dataHolder.parseInt32();
          debugLog("    weight = " + logFloat(weight));

          var propertyBits = dataHolder.parseInt32();
          debugLog("    property bits = " + propertyBits.toString(2));
          var plastic = !!(propertyBits & 1);
          var roughness = !!(propertyBits & 2);
          var specular = !!(propertyBits & 4);
          var ior = !!(propertyBits & 8);
          var attenuation = !!(propertyBits & 16);
          var power = !!(propertyBits & 32);
          var glow = !!(propertyBits & 64);

          var valueNum = 0;
          if (plastic) valueNum += 1;
          if (roughness) valueNum += 1;
          if (specular) valueNum += 1;
          if (ior) valueNum += 1;
          if (attenuation) valueNum += 1;
          if (power) valueNum += 1;
          if (glow) valueNum += 1;
          // isTotalPower is no value
          
          var values = [];
          for (var j = 0; j < valueNum; j++) {
              values[j] = dataHolder.parseInt32();
              debugLog("    normalized property value = " + logFloat(values[j]));
          }
      };

      var contentsOfTransformNodeChunk = function(dataHolder) {
          var nodeId = dataHolder.parseInt32();
          var nodeAttributes = dataHolder.parseDict();
          var childNodeId = dataHolder.parseInt32();
          var reservedId = dataHolder.parseInt32();
          var layerId = dataHolder.parseInt32();
          var numOfFrames = dataHolder.parseInt32();
          var frameAttributes = [];
          for (var i = 0; i < numOfFrames; i++) {
              frameAttributes[i] = dataHolder.parseDict();
          }
      };

      var contentsOfGroupNodeChunk = function(dataHolder) {
          var nodeId = dataHolder.parseInt32();
          var nodeAttributes = dataHolder.parseDict();
          var numOfChildren = dataHolder.parseInt32();
          var childNodeIds = [];
          for (var i = 0; i < numOfChildren; i++) {
              childNodeIds[i] = dataHolder.parseInt32();
          }
      };

      var contentsOfShapeNodeChunk = function(dataHolder) {
          var nodeId = dataHolder.parseInt32();
          var nodeAttributes = dataHolder.parseDict();
          var numOfModels = dataHolder.parseInt32();
          var modelIds = [];
          var modelAttributes = [];
          for (var i = 0; i < numOfModels; i++) {
              modelIds[i] = dataHolder.parseInt32();
              modelAttributes[i] = dataHolder.parseDict();
          }
      };

      var contentsOfMaterialExChunk = function(dataHolder) {
          var materialId = dataHolder.parseInt32();
          var properties = dataHolder.parseDict();
      };

      var logFloat = function(bytes) {
          var bin = bytes.toString(2);
          while(bin.length < 32) {
              bin = "0" + bin;
          }
          var sign = bin[0] == "0" ? 1 : -1;
          var exponent = Number.parseInt(bin.substring(1, 9), 2) - 127;
          var fraction = Number.parseFloat("1." + Number.parseInt(bin.substring(9), 2));
          return sign * Math.pow(2, exponent) * fraction;
      };

      var debugLog = function(arg0, arg1) {
          // console.debug(arg0, arg1);
      };

  })();

  (function() {

      /**
       * @constructor
       *
       * @param {vox.VoxelData} voxelData
       * @param {Object=} param
       * @param {number=} param.voxelSize ボクセルの大きさ. default = 1.0.
       * @param {boolean=} param.vertexColor 頂点色を使用する. default = false.
       * @param {boolean=} param.optimizeFaces 隠れた頂点／面を削除する. dafalue = true.
       * @param {boolean=} param.originToBottom 地面の高さを形状の中心にする. dafalue = true.
       * @property {THREE.Geometry} geometry
       * @property {THREE.Material} material
       */
      vox.MeshBuilder = function(voxelData, param) {
          if (vox.MeshBuilder.textureFactory === null) vox.MeshBuilder.textureFactory = new vox.TextureFactory();
          
          param = param || {};
          this.voxelData = voxelData;
          this.voxelSize = param.voxelSize || vox.MeshBuilder.DEFAULT_PARAM.voxelSize;
          this.vertexColor = (param.vertexColor === undefined) ? vox.MeshBuilder.DEFAULT_PARAM.vertexColor : param.vertexColor;
          this.optimizeFaces = (param.optimizeFaces === undefined) ? vox.MeshBuilder.DEFAULT_PARAM.optimizeFaces : param.optimizeFaces;
          this.originToBottom = (param.originToBottom === undefined) ? vox.MeshBuilder.DEFAULT_PARAM.originToBottom : param.originToBottom;

          this.geometry = null;
          this.material = null;
          
          this.build();
      };

      vox.MeshBuilder.DEFAULT_PARAM = {
          voxelSize: 1.0,
          vertexColor: false,
          optimizeFaces: true,
          originToBottom: true,
      };

      /**
       * Voxelデータからジオメトリとマテリアルを作成する.
       */
      vox.MeshBuilder.prototype.build = function() {
          this.geometry = new THREE.Geometry();
          this.material = new THREE.MeshPhongMaterial();

          // 隣接ボクセル検索用ハッシュテーブル
          this.hashTable = createHashTable(this.voxelData.voxels);
          
          var offsetX = (this.voxelData.size.x - 1) * -0.5;
          var offsetY = (this.voxelData.size.y - 1) * -0.5;
          var offsetZ = (this.originToBottom) ? 0 : (this.voxelData.size.z - 1) * -0.5;
          var matrix = new THREE.Matrix4();
          this.voxelData.voxels.forEach(function(voxel) {
              var voxGeometry = this._createVoxGeometry(voxel);
              if (voxGeometry) {
                  matrix.makeTranslation((voxel.x + offsetX) * this.voxelSize, (voxel.z + offsetZ) * this.voxelSize, -(voxel.y + offsetY) * this.voxelSize);
                  this.geometry.merge(voxGeometry, matrix);
              }
          }.bind(this));

          if (this.optimizeFaces) {
              this.geometry.mergeVertices();
          }
          this.geometry.computeFaceNormals();
          
          if (this.vertexColor) {
              this.material.vertexColors = THREE.FaceColors;
          } else {
              this.material.map = vox.MeshBuilder.textureFactory.getTexture(this.voxelData);
          }
      };

      /**
       * @return {THREE.Texture}
       */
      vox.MeshBuilder.prototype.getTexture = function() {
          return vox.MeshBuilder.textureFactory.getTexture(this.voxelData);
      };

      vox.MeshBuilder.prototype._createVoxGeometry = function(voxel) {

          // 隣接するボクセルを検索し、存在する場合は面を無視する
          var ignoreFaces = [];
          if (this.optimizeFaces) {
              six.forEach(function(s) {
                  if (this.hashTable.has(voxel.x + s.x, voxel.y + s.y, voxel.z + s.z)) {
                      ignoreFaces.push(s.ignoreFace);
                  }
              }.bind(this));
          }
          
          // 6方向すべて隣接されていたらnullを返す
          if (ignoreFaces.length ===  6) return null;

          // 頂点データ
          var voxVertices = voxVerticesSource.map(function(voxel) {
              return new THREE.Vector3(voxel.x * this.voxelSize * 0.5, voxel.y * this.voxelSize * 0.5, voxel.z * this.voxelSize * 0.5);
          }.bind(this));

          // 面データ
          var voxFaces = voxFacesSource.map(function(f) {
              return {
                  faceA: new THREE.Face3(f.faceA.a, f.faceA.b, f.faceA.c),
                  faceB: new THREE.Face3(f.faceB.a, f.faceB.b, f.faceB.c),
              };
          });
          
          // 頂点色
          if (this.vertexColor) {
              var c = this.voxelData.palette[voxel.colorIndex];
              var color = new THREE.Color(c.r / 255, c.g / 255, c.b / 255);
          }

          var vox = new THREE.Geometry();
          vox.faceVertexUvs[0] = [];
          
          // 面を作る
          voxFaces.forEach(function(faces, i) {
              if (ignoreFaces.indexOf(i) >= 0) return;
              
              if (this.vertexColor) {
                  faces.faceA.color = color;
                  faces.faceB.color = color;
              } else {
                  var uv = new THREE.Vector2((voxel.colorIndex + 0.5) / 256, 0.5);
                  vox.faceVertexUvs[0].push([uv, uv, uv], [uv, uv, uv]);
              }
              vox.faces.push(faces.faceA, faces.faceB);
          }.bind(this));
          
          // 使っている頂点を抽出
          var usingVertices = {};
          vox.faces.forEach(function(face) {
              usingVertices[face.a] = true;
              usingVertices[face.b] = true;
              usingVertices[face.c] = true;
          });
          
          // 面の頂点インデックスを詰める処理
          var splice = function(index) {
              vox.faces.forEach(function(face) {
                  if (face.a > index) face.a -= 1;
                  if (face.b > index) face.b -= 1;
                  if (face.c > index) face.c -= 1;
              });
          };

          // 使っている頂点のみ追加する
          var j = 0;
          voxVertices.forEach(function(vertex, i) {
              if (usingVertices[i]) {
                  vox.vertices.push(vertex);
              } else {
                  splice(i - j);
                  j += 1;
              }
          });
          
          return vox;
      };

      /**
       * @return {THREE.Mesh}
       */
      vox.MeshBuilder.prototype.createMesh = function() {
          return new THREE.Mesh(this.geometry, this.material);
      };
      
      /**
       * 外側に面したボクセルか
       * @return {boolean}
       */
      vox.MeshBuilder.prototype.isOuterVoxel = function(voxel) {
          return six.filter(function(s) {
              return this.hashTable.has(voxel.x + s.x, voxel.y + s.y, voxel.z + s.z);
          }.bind(this)).length < 6;
      };

      /**
       * @static
       * @type {vox.TextureFactory}
       */
      vox.MeshBuilder.textureFactory = null;

      // 隣接方向と無視する面の対応表
      var six = [
          { x: -1, y: 0, z: 0, ignoreFace: 0 },
          { x:  1, y: 0, z: 0, ignoreFace: 1 },
          { x:  0, y:-1, z: 0, ignoreFace: 5 },
          { x:  0, y: 1, z: 0, ignoreFace: 4 },
          { x:  0, y: 0, z:-1, ignoreFace: 2 },
          { x:  0, y: 0, z: 1, ignoreFace: 3 },
      ];

      // 頂点データソース
      var voxVerticesSource = [
          { x: -1, y: 1, z:-1 },
          { x:  1, y: 1, z:-1 },
          { x: -1, y: 1, z: 1 },
          { x:  1, y: 1, z: 1 },
          { x: -1, y:-1, z:-1 },
          { x:  1, y:-1, z:-1 },
          { x: -1, y:-1, z: 1 },
          { x:  1, y:-1, z: 1 },
      ];

      // 面データソース
      var voxFacesSource = [
          { faceA: { a:6, b:2, c:0 }, faceB: { a:6, b:0, c:4 } },
          { faceA: { a:5, b:1, c:3 }, faceB: { a:5, b:3, c:7 } },
          { faceA: { a:5, b:7, c:6 }, faceB: { a:5, b:6, c:4 } },
          { faceA: { a:2, b:3, c:1 }, faceB: { a:2, b:1, c:0 } },
          { faceA: { a:4, b:0, c:1 }, faceB: { a:4, b:1, c:5 } },
          { faceA: { a:7, b:3, c:2 }, faceB: { a:7, b:2, c:6 } },
      ];

      var hash = function(x, y, z) {
          return "x" + x + "y" + y + "z" + z;
      };

      var createHashTable = function(voxels) {
          var hashTable = {};
          voxels.forEach(function(v) {
              hashTable[hash(v.x, v.y, v.z)] = true;
          });
          
          hashTable.has = function(x, y, z) {
              return hash(x, y, z) in this;
          };
          return hashTable;
      };

  })();

  (function() {
      /**
       * @constructor
       */
      vox.TextureFactory = function() {};

      /**
       * @param {vox.VoxelData} voxelData
       * @return {HTMLCanvasElement}
       */
      vox.TextureFactory.prototype.createCanvas = function(voxelData) {
          var canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height= 1;
          var context = canvas.getContext("2d");
          for (var i = 0, len = voxelData.palette.length; i < len; i++) {
              var p = voxelData.palette[i];
              context.fillStyle = "rgb(" + p.r + "," + p.g + "," + p.b + ")";
              context.fillRect(i * 1, 0, 1, 1);
          }
          
          return canvas;
      };
      
      /**
       * パレット情報を元に作成したテクスチャを返す.
       * 生成されたテクスチャはキャッシュされ、同一のパレットからは同じテクスチャオブジェクトが返される.
       * @param {vox.VoxelData} voxelData
       * @return {THREE.Texture}
       */
      vox.TextureFactory.prototype.getTexture = function(voxelData) {
          var palette = voxelData.palette;
          var hashCode = getHashCode(palette);
          if (hashCode in cache) {
              // console.log("cache hit");
              return cache[hashCode];
          }
          
          var canvas = this.createCanvas(voxelData);
          var texture = new THREE.Texture(canvas);
          texture.needsUpdate = true;
          
          cache[hashCode] = texture;
          
          return texture;
      };
      
      var cache = {};
      
      var getHashCode = function(palette) {
          var str = "";
          for (var i = 0; i < 256; i++) {
              var p = palette[i];
              str += hex(p.r);
              str += hex(p.g);
              str += hex(p.b);
              str += hex(p.a);
          }
          return vox.md5(str);
      };
      var hex = function(num) {
          var r = num.toString(16);
          return (r.length === 1) ? "0" + r : r;
      };

  })();

  (function() {

      /**
       * MagicaVoxelのデフォルトパレット
       * @static
       */    
      vox.defaultPalette = [
          {r:255,g:255,b:255,a:255},
          {r:255,g:255,b:255,a:255},
          {r:255,g:255,b:204,a:255},
          {r:255,g:255,b:153,a:255},
          {r:255,g:255,b:102,a:255},
          {r:255,g:255,b:51,a:255},
          {r:255,g:255,b:0,a:255},
          {r:255,g:204,b:255,a:255},
          {r:255,g:204,b:204,a:255},
          {r:255,g:204,b:153,a:255},
          {r:255,g:204,b:102,a:255},
          {r:255,g:204,b:51,a:255},
          {r:255,g:204,b:0,a:255},
          {r:255,g:153,b:255,a:255},
          {r:255,g:153,b:204,a:255},
          {r:255,g:153,b:153,a:255},
          {r:255,g:153,b:102,a:255},
          {r:255,g:153,b:51,a:255},
          {r:255,g:153,b:0,a:255},
          {r:255,g:102,b:255,a:255},
          {r:255,g:102,b:204,a:255},
          {r:255,g:102,b:153,a:255},
          {r:255,g:102,b:102,a:255},
          {r:255,g:102,b:51,a:255},
          {r:255,g:102,b:0,a:255},
          {r:255,g:51,b:255,a:255},
          {r:255,g:51,b:204,a:255},
          {r:255,g:51,b:153,a:255},
          {r:255,g:51,b:102,a:255},
          {r:255,g:51,b:51,a:255},
          {r:255,g:51,b:0,a:255},
          {r:255,g:0,b:255,a:255},
          {r:255,g:0,b:204,a:255},
          {r:255,g:0,b:153,a:255},
          {r:255,g:0,b:102,a:255},
          {r:255,g:0,b:51,a:255},
          {r:255,g:0,b:0,a:255},
          {r:204,g:255,b:255,a:255},
          {r:204,g:255,b:204,a:255},
          {r:204,g:255,b:153,a:255},
          {r:204,g:255,b:102,a:255},
          {r:204,g:255,b:51,a:255},
          {r:204,g:255,b:0,a:255},
          {r:204,g:204,b:255,a:255},
          {r:204,g:204,b:204,a:255},
          {r:204,g:204,b:153,a:255},
          {r:204,g:204,b:102,a:255},
          {r:204,g:204,b:51,a:255},
          {r:204,g:204,b:0,a:255},
          {r:204,g:153,b:255,a:255},
          {r:204,g:153,b:204,a:255},
          {r:204,g:153,b:153,a:255},
          {r:204,g:153,b:102,a:255},
          {r:204,g:153,b:51,a:255},
          {r:204,g:153,b:0,a:255},
          {r:204,g:102,b:255,a:255},
          {r:204,g:102,b:204,a:255},
          {r:204,g:102,b:153,a:255},
          {r:204,g:102,b:102,a:255},
          {r:204,g:102,b:51,a:255},
          {r:204,g:102,b:0,a:255},
          {r:204,g:51,b:255,a:255},
          {r:204,g:51,b:204,a:255},
          {r:204,g:51,b:153,a:255},
          {r:204,g:51,b:102,a:255},
          {r:204,g:51,b:51,a:255},
          {r:204,g:51,b:0,a:255},
          {r:204,g:0,b:255,a:255},
          {r:204,g:0,b:204,a:255},
          {r:204,g:0,b:153,a:255},
          {r:204,g:0,b:102,a:255},
          {r:204,g:0,b:51,a:255},
          {r:204,g:0,b:0,a:255},
          {r:153,g:255,b:255,a:255},
          {r:153,g:255,b:204,a:255},
          {r:153,g:255,b:153,a:255},
          {r:153,g:255,b:102,a:255},
          {r:153,g:255,b:51,a:255},
          {r:153,g:255,b:0,a:255},
          {r:153,g:204,b:255,a:255},
          {r:153,g:204,b:204,a:255},
          {r:153,g:204,b:153,a:255},
          {r:153,g:204,b:102,a:255},
          {r:153,g:204,b:51,a:255},
          {r:153,g:204,b:0,a:255},
          {r:153,g:153,b:255,a:255},
          {r:153,g:153,b:204,a:255},
          {r:153,g:153,b:153,a:255},
          {r:153,g:153,b:102,a:255},
          {r:153,g:153,b:51,a:255},
          {r:153,g:153,b:0,a:255},
          {r:153,g:102,b:255,a:255},
          {r:153,g:102,b:204,a:255},
          {r:153,g:102,b:153,a:255},
          {r:153,g:102,b:102,a:255},
          {r:153,g:102,b:51,a:255},
          {r:153,g:102,b:0,a:255},
          {r:153,g:51,b:255,a:255},
          {r:153,g:51,b:204,a:255},
          {r:153,g:51,b:153,a:255},
          {r:153,g:51,b:102,a:255},
          {r:153,g:51,b:51,a:255},
          {r:153,g:51,b:0,a:255},
          {r:153,g:0,b:255,a:255},
          {r:153,g:0,b:204,a:255},
          {r:153,g:0,b:153,a:255},
          {r:153,g:0,b:102,a:255},
          {r:153,g:0,b:51,a:255},
          {r:153,g:0,b:0,a:255},
          {r:102,g:255,b:255,a:255},
          {r:102,g:255,b:204,a:255},
          {r:102,g:255,b:153,a:255},
          {r:102,g:255,b:102,a:255},
          {r:102,g:255,b:51,a:255},
          {r:102,g:255,b:0,a:255},
          {r:102,g:204,b:255,a:255},
          {r:102,g:204,b:204,a:255},
          {r:102,g:204,b:153,a:255},
          {r:102,g:204,b:102,a:255},
          {r:102,g:204,b:51,a:255},
          {r:102,g:204,b:0,a:255},
          {r:102,g:153,b:255,a:255},
          {r:102,g:153,b:204,a:255},
          {r:102,g:153,b:153,a:255},
          {r:102,g:153,b:102,a:255},
          {r:102,g:153,b:51,a:255},
          {r:102,g:153,b:0,a:255},
          {r:102,g:102,b:255,a:255},
          {r:102,g:102,b:204,a:255},
          {r:102,g:102,b:153,a:255},
          {r:102,g:102,b:102,a:255},
          {r:102,g:102,b:51,a:255},
          {r:102,g:102,b:0,a:255},
          {r:102,g:51,b:255,a:255},
          {r:102,g:51,b:204,a:255},
          {r:102,g:51,b:153,a:255},
          {r:102,g:51,b:102,a:255},
          {r:102,g:51,b:51,a:255},
          {r:102,g:51,b:0,a:255},
          {r:102,g:0,b:255,a:255},
          {r:102,g:0,b:204,a:255},
          {r:102,g:0,b:153,a:255},
          {r:102,g:0,b:102,a:255},
          {r:102,g:0,b:51,a:255},
          {r:102,g:0,b:0,a:255},
          {r:51,g:255,b:255,a:255},
          {r:51,g:255,b:204,a:255},
          {r:51,g:255,b:153,a:255},
          {r:51,g:255,b:102,a:255},
          {r:51,g:255,b:51,a:255},
          {r:51,g:255,b:0,a:255},
          {r:51,g:204,b:255,a:255},
          {r:51,g:204,b:204,a:255},
          {r:51,g:204,b:153,a:255},
          {r:51,g:204,b:102,a:255},
          {r:51,g:204,b:51,a:255},
          {r:51,g:204,b:0,a:255},
          {r:51,g:153,b:255,a:255},
          {r:51,g:153,b:204,a:255},
          {r:51,g:153,b:153,a:255},
          {r:51,g:153,b:102,a:255},
          {r:51,g:153,b:51,a:255},
          {r:51,g:153,b:0,a:255},
          {r:51,g:102,b:255,a:255},
          {r:51,g:102,b:204,a:255},
          {r:51,g:102,b:153,a:255},
          {r:51,g:102,b:102,a:255},
          {r:51,g:102,b:51,a:255},
          {r:51,g:102,b:0,a:255},
          {r:51,g:51,b:255,a:255},
          {r:51,g:51,b:204,a:255},
          {r:51,g:51,b:153,a:255},
          {r:51,g:51,b:102,a:255},
          {r:51,g:51,b:51,a:255},
          {r:51,g:51,b:0,a:255},
          {r:51,g:0,b:255,a:255},
          {r:51,g:0,b:204,a:255},
          {r:51,g:0,b:153,a:255},
          {r:51,g:0,b:102,a:255},
          {r:51,g:0,b:51,a:255},
          {r:51,g:0,b:0,a:255},
          {r:0,g:255,b:255,a:255},
          {r:0,g:255,b:204,a:255},
          {r:0,g:255,b:153,a:255},
          {r:0,g:255,b:102,a:255},
          {r:0,g:255,b:51,a:255},
          {r:0,g:255,b:0,a:255},
          {r:0,g:204,b:255,a:255},
          {r:0,g:204,b:204,a:255},
          {r:0,g:204,b:153,a:255},
          {r:0,g:204,b:102,a:255},
          {r:0,g:204,b:51,a:255},
          {r:0,g:204,b:0,a:255},
          {r:0,g:153,b:255,a:255},
          {r:0,g:153,b:204,a:255},
          {r:0,g:153,b:153,a:255},
          {r:0,g:153,b:102,a:255},
          {r:0,g:153,b:51,a:255},
          {r:0,g:153,b:0,a:255},
          {r:0,g:102,b:255,a:255},
          {r:0,g:102,b:204,a:255},
          {r:0,g:102,b:153,a:255},
          {r:0,g:102,b:102,a:255},
          {r:0,g:102,b:51,a:255},
          {r:0,g:102,b:0,a:255},
          {r:0,g:51,b:255,a:255},
          {r:0,g:51,b:204,a:255},
          {r:0,g:51,b:153,a:255},
          {r:0,g:51,b:102,a:255},
          {r:0,g:51,b:51,a:255},
          {r:0,g:51,b:0,a:255},
          {r:0,g:0,b:255,a:255},
          {r:0,g:0,b:204,a:255},
          {r:0,g:0,b:153,a:255},
          {r:0,g:0,b:102,a:255},
          {r:0,g:0,b:51,a:255},
          {r:238,g:0,b:0,a:255},
          {r:221,g:0,b:0,a:255},
          {r:187,g:0,b:0,a:255},
          {r:170,g:0,b:0,a:255},
          {r:136,g:0,b:0,a:255},
          {r:119,g:0,b:0,a:255},
          {r:85,g:0,b:0,a:255},
          {r:68,g:0,b:0,a:255},
          {r:34,g:0,b:0,a:255},
          {r:17,g:0,b:0,a:255},
          {r:0,g:238,b:0,a:255},
          {r:0,g:221,b:0,a:255},
          {r:0,g:187,b:0,a:255},
          {r:0,g:170,b:0,a:255},
          {r:0,g:136,b:0,a:255},
          {r:0,g:119,b:0,a:255},
          {r:0,g:85,b:0,a:255},
          {r:0,g:68,b:0,a:255},
          {r:0,g:34,b:0,a:255},
          {r:0,g:17,b:0,a:255},
          {r:0,g:0,b:238,a:255},
          {r:0,g:0,b:221,a:255},
          {r:0,g:0,b:187,a:255},
          {r:0,g:0,b:170,a:255},
          {r:0,g:0,b:136,a:255},
          {r:0,g:0,b:119,a:255},
          {r:0,g:0,b:85,a:255},
          {r:0,g:0,b:68,a:255},
          {r:0,g:0,b:34,a:255},
          {r:0,g:0,b:17,a:255},

          {r:238,g:238,b:238,a:255},

          {r:221,g:221,b:221,a:255},
          {r:187,g:187,b:187,a:255},
          {r:170,g:170,b:170,a:255},
          {r:136,g:136,b:136,a:255},
          {r:119,g:119,b:119,a:255},
          {r:85,g:85,b:85,a:255},
          {r:68,g:68,b:68,a:255},
          {r:34,g:34,b:34,a:255},
          {r:17,g:17,b:17,a:255},
          // {r:0,g:0,b:0,a:255},
      ];
      
  })();

  (function() {



  /* md5.js - MD5 Message-Digest
   * Copyright (C) 1999,2002 Masanao Izumo <iz@onicos.co.jp>
   * Version: 2.0.0
   * LastModified: May 13 2002
   *
   * This program is free software.  You can redistribute it and/or modify
   * it without any warranty.  This library calculates the MD5 based on RFC1321.
   * See RFC1321 for more information and algorism.
   */

  /* Interface:
   * md5_128bits = MD5_hash(data);
   * md5_hexstr = MD5_hexhash(data);
   */

  /* ChangeLog
   * 2002/05/13: Version 2.0.0 released
   * NOTICE: API is changed.
   * 2002/04/15: Bug fix about MD5 length.
   */


  //    md5_T[i] = parseInt(Math.abs(Math.sin(i)) * 4294967296.0);
  var MD5_T = new Array(0x00000000, 0xd76aa478, 0xe8c7b756, 0x242070db,
                0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613,
                0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1,
                0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e,
                0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51,
                0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681,
                0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87,
                0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9,
                0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122,
                0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60,
                0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085,
                0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8,
                0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7,
                0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d,
                0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314,
                0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb,
                0xeb86d391);

  var MD5_round1 = new Array(new Array( 0, 7, 1), new Array( 1,12, 2),
                 new Array( 2,17, 3), new Array( 3,22, 4),
                 new Array( 4, 7, 5), new Array( 5,12, 6),
                 new Array( 6,17, 7), new Array( 7,22, 8),
                 new Array( 8, 7, 9), new Array( 9,12,10),
                 new Array(10,17,11), new Array(11,22,12),
                 new Array(12, 7,13), new Array(13,12,14),
                 new Array(14,17,15), new Array(15,22,16));

  var MD5_round2 = new Array(new Array( 1, 5,17), new Array( 6, 9,18),
                 new Array(11,14,19), new Array( 0,20,20),
                 new Array( 5, 5,21), new Array(10, 9,22),
                 new Array(15,14,23), new Array( 4,20,24),
                 new Array( 9, 5,25), new Array(14, 9,26),
                 new Array( 3,14,27), new Array( 8,20,28),
                 new Array(13, 5,29), new Array( 2, 9,30),
                 new Array( 7,14,31), new Array(12,20,32));

  var MD5_round3 = new Array(new Array( 5, 4,33), new Array( 8,11,34),
                 new Array(11,16,35), new Array(14,23,36),
                 new Array( 1, 4,37), new Array( 4,11,38),
                 new Array( 7,16,39), new Array(10,23,40),
                 new Array(13, 4,41), new Array( 0,11,42),
                 new Array( 3,16,43), new Array( 6,23,44),
                 new Array( 9, 4,45), new Array(12,11,46),
                 new Array(15,16,47), new Array( 2,23,48));

  var MD5_round4 = new Array(new Array( 0, 6,49), new Array( 7,10,50),
                 new Array(14,15,51), new Array( 5,21,52),
                 new Array(12, 6,53), new Array( 3,10,54),
                 new Array(10,15,55), new Array( 1,21,56),
                 new Array( 8, 6,57), new Array(15,10,58),
                 new Array( 6,15,59), new Array(13,21,60),
                 new Array( 4, 6,61), new Array(11,10,62),
                 new Array( 2,15,63), new Array( 9,21,64));

  function MD5_F(x, y, z) { return (x & y) | (~x & z); }
  function MD5_G(x, y, z) { return (x & z) | (y & ~z); }
  function MD5_H(x, y, z) { return x ^ y ^ z;          }
  function MD5_I(x, y, z) { return y ^ (x | ~z);       }

  var MD5_round = new Array(new Array(MD5_F, MD5_round1),
                new Array(MD5_G, MD5_round2),
                new Array(MD5_H, MD5_round3),
                new Array(MD5_I, MD5_round4));

  function MD5_pack(n32) {
    return String.fromCharCode(n32 & 0xff) +
       String.fromCharCode((n32 >>> 8) & 0xff) +
       String.fromCharCode((n32 >>> 16) & 0xff) +
       String.fromCharCode((n32 >>> 24) & 0xff);
  }

  function MD5_number(n) {
    while (n < 0)
      n += 4294967296;
    while (n > 4294967295)
      n -= 4294967296;
    return n;
  }

  function MD5_apply_round(x, s, f, abcd, r) {
    var a, b, c, d;
    var kk, ss, ii;
    var t, u;

    a = abcd[0];
    b = abcd[1];
    c = abcd[2];
    d = abcd[3];
    kk = r[0];
    ss = r[1];
    ii = r[2];

    u = f(s[b], s[c], s[d]);
    t = s[a] + u + x[kk] + MD5_T[ii];
    t = MD5_number(t);
    t = ((t<<ss) | (t>>>(32-ss)));
    t += s[b];
    s[a] = MD5_number(t);
  }

  function MD5_hash(data) {
    var abcd, x, state, s;
    var len, index, padLen, f, r;
    var i, j, k;
    var tmp;

    state = new Array(0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476);
    len = data.length;
    index = len & 0x3f;
    padLen = (index < 56) ? (56 - index) : (120 - index);
    if(padLen > 0) {
      data += "\x80";
      for(i = 0; i < padLen - 1; i++)
        data += "\x00";
    }
    data += MD5_pack(len * 8);
    data += MD5_pack(0);
    len  += padLen + 8;
    abcd = new Array(0, 1, 2, 3);
    x    = new Array(16);
    s    = new Array(4);

    for(k = 0; k < len; k += 64) {
      for(i = 0, j = k; i < 16; i++, j += 4) {
        x[i] = data.charCodeAt(j) |
          (data.charCodeAt(j + 1) <<  8) |
          (data.charCodeAt(j + 2) << 16) |
          (data.charCodeAt(j + 3) << 24);
      }
      for(i = 0; i < 4; i++)
        s[i] = state[i];
      for(i = 0; i < 4; i++) {
        f = MD5_round[i][0];
        r = MD5_round[i][1];
        for(j = 0; j < 16; j++) {
      MD5_apply_round(x, s, f, abcd, r[j]);
      tmp = abcd[0];
      abcd[0] = abcd[3];
      abcd[3] = abcd[2];
      abcd[2] = abcd[1];
      abcd[1] = tmp;
        }
      }

      for(i = 0; i < 4; i++) {
        state[i] += s[i];
        state[i] = MD5_number(state[i]);
      }
    }

    return MD5_pack(state[0]) +
       MD5_pack(state[1]) +
       MD5_pack(state[2]) +
       MD5_pack(state[3]);
  }

  function MD5_hexhash(data) {
      var i, out, c;
      var bit128;

      bit128 = MD5_hash(data);
      out = "";
      for(i = 0; i < 16; i++) {
      c = bit128.charCodeAt(i);
      out += "0123456789abcdef".charAt((c>>4) & 0xf);
      out += "0123456789abcdef".charAt(c & 0xf);
      }
      return out;
  }



  vox.md5 = MD5_hexhash;
  })();

  const vertexShader = `#version 300 es
precision highp float;
precision highp int;

#define d(b,x,y,z) \
if((face & b) > 0u){ \
vec3 f = u_rotate * vec3(x,y,z); \
float e = dot(f,u_eye); \
if(e >  eye_dot){ \
  eye_dot = e; \
  diffuse = dot(f,u_light); \
} \
}

/**********************************************

Vox オブジェクトの表示
(なんちゃって3D)

**********************************************/


// 座標 X,Y,Z
layout(location = 0) in vec3 position;
// カラーと面情報
layout(location = 1) in uint point_attrib;

// フラグメント・シェーダーに渡す変数
flat out uint v_color_index;// 色 インデックス
flat out uint v_pallete_index;
flat out float v_diffuse;//  
flat out vec3 v_ambient;
flat out float v_alpha;

#define root2 1.414213562

uniform uint u_attrib;
uniform float u_scale;
uniform mat3 u_rotate;
uniform vec3 u_obj_position;
uniform mat4 u_worldViewProjection; // 変換行列
uniform vec3 u_eye;
uniform vec3 u_light;
uniform vec3 u_ambient;


void main() {
  
  uint face = (point_attrib & 0xffff0000u) >> 16u;

  // 表示位置の計算
  vec4 pos = u_worldViewProjection * vec4( u_rotate * position * u_scale + u_obj_position ,1.0) ;
  //vec4 pos = u_worldViewProjection * vec4(  position  ,1.0) ;
  
  // ライティング用のベクトルを作る
  float diffuse;
  float eye_dot;
  
  d(0x1u,-1.,0.,0.);
  d(0x2u,1.,0.,0.);
  d(0x4u,0.,-1.,0.);
  d(0x8u,0.,1.,0.);
  d(0x10u,0.,0.,-1.);
  d(0x20u,0.,0.,1.);

  v_diffuse = clamp(diffuse, 0.0, 1.0);
 
  v_color_index  = point_attrib & 0xffu;
  v_pallete_index = u_attrib & 0x1ffu;
 
  v_ambient = u_ambient;
  v_alpha = float((u_attrib & 0x3fc00u) >> 10u) / 255.0;

  gl_Position = pos;
  // セルサイズの計算（今のところかなりいい加減。。）
  gl_PointSize = clamp((127.0 - pos.z) / 6.0 ,root2 * u_scale,128.0);
}
`;

  const fragmentShader = `#version 300 es
precision highp float;
precision highp int;


// 頂点シェーダーからの情報
flat in uint v_color_index;// 色
flat in uint v_pallete_index;// 色
flat in float v_diffuse;
flat in vec3 v_ambient;
flat in float v_alpha;

uniform sampler2D u_pallete; 

#define root2 1.414213562

// 出力色
out vec4 fcolor;

void main() {
  vec4 color = texelFetch(u_pallete,ivec2(int(v_color_index),int(v_pallete_index)),0) ;
  color = vec4(color.rgb * v_diffuse,color.a);
  color = clamp(color + vec4(v_ambient,0.),0.0,1.0);
  fcolor = vec4(color.rgb, color.a * v_alpha);
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

  // const voxCharacters = [];

  function sign(x){
    return x == 0 ? 0 : ( x > 0 ? 1 : -1);
  }

  const faces = [
    {x:-1,y:0,z:0,face:1},
    {x:1,y:0,z:0,face:2},
    {x:0,y:-1,z:0,face:4},
    {x:0,y:1,z:0,face:8},
    {x:0,y:0,z:-1,face:16},
    {x:0,y:0,z:1,face:32}
  ];


  class VoxelModel {
    constructor(voxelData){
     
      const points = [];
      const voxelMap = new Map();
      voxelData.voxels.forEach(d=>{
        let p = create$2();
        p[0] = d.x - (voxelData.size.x >> 1);
        p[1] = d.y - (voxelData.size.y >> 1);
        p[2] = d.z - (voxelData.size.z >> 1);
        
        let s = clone(p);
        set(s,sign(s[0]),sign(s[1]),sign(s[2]));
        voxelMap.set('x' + p[0] + 'y' + p[1] + 'z' + p[2] , true );
        points.push({point:p,sign:s,color: d.colorIndex});
      });

      this.points = [];

      for(const p of points){
       const openFaces = faces.filter(d=>{
          return !voxelMap.get('x' + (p.point[0] + d.x) + 'y' + (p.point[1] + d.y) + 'z' + (p.point[2] + d.z));
        });

        // 見えないボクセルはスキップする
        if(openFaces.length == 0){
          continue;
        }
        // 
        let openFlag = openFaces.reduce((a,v)=>a|v.face,0);
        p.openFlag = openFlag;
        p.openFaces = openFaces;
        this.points.push(p);
      }

      const colorPallete = [];

      for(const color of voxelData.palette)
      {
        colorPallete.push(color.r);
        colorPallete.push(color.g);
        colorPallete.push(color.b);
        colorPallete.push(color.a);
      }
      // colorPallete[0] = 0;
      // colorPallete[1] = 0;
      // colorPallete[2] = 0;
      // colorPallete[3] = 0;

      this.colorPallete = new Uint8Array(colorPallete);
      this.voxCount = this.points.length;
      this.voxByteCount = this.voxCount * this.POINT_DATA_SIZE;
      this.endian = checkEndian();
    }

    setBuffer(offset,dv)
    {
      for(const p of this.points){
        dv.setFloat32(offset,p.point[0] ,this.endian);
        dv.setFloat32(offset + 4, p.point[1],this.endian);
        dv.setFloat32(offset + 8, p.point[2],this.endian);
        dv.setUint32(offset + 12,p.color | (p.openFlag << 16),this.endian);
        offset += 16;
      }
      return offset;
    }

    static async loadFromUrls(voxelUrls){
      const voxelModels = {};
      const parser = new vox.Parser();
      const models = [];
      let bufferLength = 0;
      for(const url of voxelUrls){
        const data = await parser.parse(url);
        const voxelModel = new VoxelModel(data);
        models.push(voxelModel);
        bufferLength += voxelModel.voxByteCount;
      }

      const buffer = new ArrayBuffer(bufferLength);
      const dv = new DataView(buffer);
      const palletes = new Uint8Array(256 /* pallete */ * 4 /* rgba */ * models.length );
      let offset = 0,poffset = 0,vindex = 0;

      voxelModels.modelInfos = [];
      voxelModels.palletes = palletes;
      voxelModels.buffer = buffer;


      for(let i = 0;i < models.length;++i){
        const data = models[i];
        voxelModels.modelInfos.push(
          {
            index:i,
            vindex:vindex,
            count:data.voxCount
          }
        );
        offset = data.setBuffer(offset,dv);
        vindex += data.voxCount;
        for(let pi = 0;pi < data.colorPallete.length;++pi){
          palletes[poffset++] = data.colorPallete[pi];
        }
      }
      return voxelModels;
    }
  }

  VoxelModel.prototype.POINT_DATA_SIZE = 4 * 4;

  const SIZE_PARAM = 4;
  const VOX_OBJ_POS = 0;
  const VOX_OBJ_POS_SIZE = 3 * SIZE_PARAM; // vec3
  const VOX_OBJ_SCALE = VOX_OBJ_POS + VOX_OBJ_POS_SIZE;
  const VOX_OBJ_SCALE_SIZE = SIZE_PARAM; // float
  const VOX_OBJ_AXIS = VOX_OBJ_SCALE + VOX_OBJ_SCALE_SIZE;
  const VOX_OBJ_AXIS_SIZE = SIZE_PARAM * 3; // vec3
  const VOX_OBJ_ANGLE = VOX_OBJ_AXIS + VOX_OBJ_AXIS_SIZE;
  const VOX_OBJ_ANGLE_SIZE = SIZE_PARAM * 1; // float
  const VOX_OBJ_ATTRIB = VOX_OBJ_ANGLE+ VOX_OBJ_ANGLE_SIZE;
  const VOX_OBJ_ATTRIB_SIZE = SIZE_PARAM; // uint
  // アトリビュートのビット構成
  // v00n nnnn nnnn 00aa aaaa aadc cccc cccc
  // v: 1 ... 表示 0 ... 非表示
  // n: object No (0-511)
  // a: alpha (0-255)
  // c: color pallet index (0-511)
  // d: use default pallet;
  const VOX_MEMORY_STRIDE =  (VOX_OBJ_POS_SIZE + VOX_OBJ_SCALE_SIZE + VOX_OBJ_AXIS_SIZE + VOX_OBJ_ANGLE_SIZE + VOX_OBJ_ATTRIB_SIZE);
  const VOX_OBJ_MAX = 8;

  const voxScreenMemory = new ArrayBuffer(
    VOX_MEMORY_STRIDE * VOX_OBJ_MAX
  );

  const parser = new vox.Parser();

  function setRotate(mat3 ,angle,  axis){

    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const r = 1.0 - c;

    mat3[0] = axis[0] * axis[0] * r + c; 
    mat3[1] = axis[1] * axis[0] * r + axis[2] * s;
    mat3[2] = axis[2] * axis[0] * r - axis[1] * s;
    mat3[3] = axis[0] * axis[1] * r - axis[2] * s;
    mat3[4] = axis[1] * axis[1] * r + c;
    mat3[5] = axis[2] * axis[1] * r + axis[0] * s;
    mat3[6] = axis[0] * axis[2] * r + axis[1] * s;
    mat3[7] = axis[1] * axis[2] * r - axis[0] * s;
    mat3[8] = axis[2] * axis[2] * r + c;
    return mat3;
  }


  class Vox extends Node {
    constructor({ gl2, voxelModels,visible = true}) {
      super();
      // webgl コンテキストの保存
      const gl = this.gl = gl2.gl;
      this.gl2 = gl2;
      this.endian = checkEndian();
      this.voxScreenMemory = new DataView(voxScreenMemory);
      this.voxScreenBuffer = new Uint8Array(voxScreenMemory);
      this.voxelModels = voxelModels;
      this.voxelBuffer = this.voxelModels.buffer;
        
      // スプライト面の表示・非表示
      this.visible = visible;


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
      gl.bufferData(gl.ARRAY_BUFFER, this.voxelBuffer, gl.DYNAMIC_DRAW);

      // 属性ロケーションIDの取得と保存
      this.positionLocation = 0;
      this.pointAttribLocation = 1;

      this.stride = 16;

      // 属性の有効化とシェーダー属性とバッファ位置の結び付け
      // 位置
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, true, this.stride, 0);
      
      // 属性
      gl.enableVertexAttribArray(this.pointAttribLocation);
      gl.vertexAttribIPointer(this.pointAttribLocation, 1, gl.UNSIGNED_INT, this.stride, 12);

      gl.bindVertexArray(null);

      // uniform変数の位置の取得と保存

      // UBO
      // this.objAttrLocation = gl.getUniformBlockIndex(program,'obj_attributes');
      // gl.uniformBlockBinding(program,this.objAttrLocation,0);
      // this.objAttrBuffer = gl.createBuffer();
      // gl.bindBuffer(gl.UNIFORM_BUFFER, this.objAttrBuffer);
      // gl.bufferData(gl.UNIFORM_BUFFER,VOX_MEMORY_STRIDE,gl.DYNAMIC_DRAW);
      // //gl.bufferData(gl.UNIFORM_BUFFER, this.voxScreenMemory.buffer, gl.DYNAMIC_DRAW,0,VOX_MEMORY_STRIDE);
      // gl.bindBuffer(gl.UNIFORM_BUFFER, null);
      // gl.bindBufferBase(gl.UNIFORM_BUFFER,0,this.objAttrBuffer);

      // 
      this.attribLocation = gl.getUniformLocation(program,'u_attrib');
      this.scaleLocation = gl.getUniformLocation(program,'u_scale');
      this.rotateLocation = gl.getUniformLocation(program,'u_rotate');
      this.rotate = create();
      this.objPositionLocation = gl.getUniformLocation(program,'u_obj_position');


      // ワールド・ビュー変換行列
      this.viewProjectionLocation = gl.getUniformLocation(program,'u_worldViewProjection');
      this.viewProjection = create$1();
      this.eyeLocation = gl.getUniformLocation(program,'u_eye');
      this.eye = create$2();
      set(this.eye,0,0,1);
      

      // 平行光源の方向ベクトル
      
      this.lightLocation = gl.getUniformLocation(program,'u_light');
      this.lightDirection = create$2();
      set(this.lightDirection,0,0,1);

      // 環境光
      this.ambient = create$2();
      this.ambientLocation = gl.getUniformLocation(program,'u_ambient');
      set(this.ambient,0.2,0.2,0.2);

      // カラーパレット
      this.palleteTexture = gl.createTexture();
      this.palleteLocation = gl.getUniformLocation(program,'u_pallete');
      
      //gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.bindTexture(gl.TEXTURE_2D, this.palleteTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, this.voxelModels.modelInfos.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.voxelModels.palletes);
      gl.bindTexture(gl.TEXTURE_2D, null);

      this.sampler = gl.createSampler();
      gl.samplerParameteri(this.sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.samplerParameteri(this.sampler, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      this.count = 0;
      const memory = this.voxScreenMemory;
      let px = -70,count=1;

      for(let offset = 0,eo = memory.byteLength;offset < eo;offset += VOX_MEMORY_STRIDE){
        memory.setUint32(offset + VOX_OBJ_ATTRIB,0x8003fc00 | count++ | ((count & 0x3) << 20),this.endian);
        memory.setFloat32(offset + VOX_OBJ_SCALE,1.0 + Math.random(),this.endian);
        memory.setFloat32(offset + VOX_OBJ_POS,px,this.endian);
        memory.setFloat32(offset + VOX_OBJ_ANGLE,count,this.endian);
        px += 20;
      }
    }

    // スプライトを描画
    render(screen) {
      const gl = this.gl;

      // プログラムの指定
      gl.useProgram(this.program);

      // VoxBufferの内容を更新
      //gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      //gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.voxBuffer);

      // VAOをバインド
      gl.bindVertexArray(this.vao);
      const memory = this.voxScreenMemory;
      const endian = this.endian;

      // カラーパレットをバインド
      gl.activeTexture(this.gl.TEXTURE0);
      gl.bindTexture(this.gl.TEXTURE_2D,this.palleteTexture);
      gl.bindSampler(0,this.sampler);
      gl.uniform1i(this.palleteLocation,0);

      multiply(this.viewProjection, screen.uniforms.viewProjection, this.worldMatrix);
      gl.uniformMatrix4fv(this.viewProjectionLocation, false,this.viewProjection);
      gl.uniform3fv(this.eyeLocation, this.eye);
      gl.uniform3fv(this.lightLocation, this.lightDirection);
      gl.uniform3fv(this.ambientLocation, this.ambient);
      

      for(let offset = 0,eo = memory.byteLength;offset < eo;offset += VOX_MEMORY_STRIDE){

        // 表示ビットが立っていたら表示    
        let attribute = memory.getUint32(offset + VOX_OBJ_ATTRIB,this.endian);  
        if( attribute & 0x80000000){

          // uniform変数を更新
          let axis = new Float32Array(memory.buffer,offset + VOX_OBJ_AXIS,3);
          set(axis,1,-1,-1);
          normalize(axis,axis);
          let c = memory.getFloat32(offset + VOX_OBJ_ANGLE,endian) + 0.04;
          memory.setFloat32(offset + VOX_OBJ_ANGLE,c,endian);
          setRotate(this.rotate,memory.getFloat32(offset + VOX_OBJ_ANGLE,endian),axis);

          gl.uniform1f(this.scaleLocation,memory.getFloat32(offset + VOX_OBJ_SCALE,endian));
          gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);
          gl.uniform3fv(this.objPositionLocation,new Float32Array(memory.buffer,offset + VOX_OBJ_POS,3));

          // UBO
          // gl.bindBuffer(gl.UNIFORM_BUFFER,this.objAttrBuffer);
          // gl.bufferSubData(gl.UNIFORM_BUFFER,0,this.voxScreenBuffer,offset,VOX_MEMORY_STRIDE);
          // gl.bindBuffer(gl.UNIFORM_BUFFER,null);

          const objInfo = this.voxelModels.modelInfos[(attribute & 0x1ff00000) >> 20];
          if(attribute & 0x20000){
            // use default pallet
            attribute = (attribute & 0b11111111111111111111111000000000) | objInfo.index;
            memory.setUint32(offset + VOX_OBJ_ATTRIB,attribute,endian);
          }

          gl.uniform1ui(this.attribLocation,memory.getUint32(offset + VOX_OBJ_ATTRIB,endian));

      
          // 描画命令の発行
          gl.drawArrays(gl.POINTS, objInfo.vindex,objInfo.count);

        }

      }
      this.count += 0.04;
    }

  }

  // let display = true;
  let play = false;

  window.addEventListener('load',()=>{

    let playButton = document.getElementById('playbutton');
    playButton.addEventListener('click',function(){
        if(!play){
          playButton.setAttribute('class','hidden');
          play = true;
          start();
        }
    });
   
  });

  async function start(){
    try {
    const con = new Console(160,100);

    const textBitmap = new Uint8Array(
      await fetch('./font.bin')
        .then(r=>r.arrayBuffer()));
    con.initConsole(textBitmap);
    const gl2 = con.gl2;

    //const voxmodel = new Vox({gl2:gl2,data:await loadVox('myship.bin')});
    const voxelModels = await VoxelModel.loadFromUrls([
      'myship.bin',
      'q.bin',
      'q1.bin',
      'chr.bin'
    ]);

    const vox = new Vox({gl2:gl2,voxelModels:voxelModels});

    //const myship = new SceneNode(model);
    con.vscreen.appendScene(vox);
    
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
        // sprite.source.rotation[0] = time/2;
        // sprite.source.translation[2] = 60.0;
        // sprite.source.rotation[1] = time/2;
        //con.text.print(0,0,'WebGL2 Point Sprite ｦﾂｶｯﾀ Spriteﾋｮｳｼﾞ TEST',true,7,1);

        con.render(time);
        // const spriteBuffer = sprite.spriteBuffer;
        // for(let i = 0;i < 512;++i){
        //   const sgn = i & 1 ? -1 : 1; 
        //   spriteBuffer.setRotate(i,sgn * time * 2);
        // }
        requestAnimationFrame(main);
    }
    main();
    } catch (e) {
    alert(e.stack);
    }
  }

  // function initSprite(sprite){
  //   const spriteBuffer = sprite.spriteBuffer;
  //   const cellSize = 24;
  //   let idx = 0;
  //   //let z = 320;
  //   for(let z = -cellSize * 4 ,ez = cellSize * 4 ;z < ez;z += cellSize ){
  //     for(let y = -cellSize * 4,ey = cellSize * 4;y < ey;y += cellSize){
  //       for(let x = -cellSize * 4,ex = cellSize * 4;x < ex;x += cellSize){
  //         const pos = spriteBuffer.getPosition(idx);
  //         pos[0] = x;pos[1] = y;pos[2] = z;
  //         const color = spriteBuffer.getColor(idx);
  //         color[0] = color[1] = color[2] = color[3] = 0xff;
  //         spriteBuffer.setVisible(idx,true);
  //         spriteBuffer.setScale(idx,3);
  //         const cellPosSize = spriteBuffer.getCellPosSize(idx);
  //         cellPosSize[0] = 0 + (idx & 3) * 2;// x
  //         cellPosSize[1] = 4;// y
  //         cellPosSize[2] = 2;// * 8 = 32px: width
  //         cellPosSize[3] = 2;// don't use
  //         ++idx;
  //       }
  //     }
  //   }
  // }

}());
