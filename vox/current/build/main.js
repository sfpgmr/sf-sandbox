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
   * Creates a new vec2 initialized with the given values
   *
   * @param {Number} x X component
   * @param {Number} y Y component
   * @returns {vec2} a new 2D vector
   */
  function fromValues$2(x, y) {
    let out = new ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
  }

  /**
   * Subtracts vector b from vector a
   *
   * @param {vec2} out the receiving vector
   * @param {vec2} a the first operand
   * @param {vec2} b the second operand
   * @returns {vec2} out
   */
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
  }

  /**
   * Normalize a vec2
   *
   * @param {vec2} out the receiving vector
   * @param {vec2} a vector to normalize
   * @returns {vec2} out
   */
  function normalize$3(out, a) {
    var x = a[0],
      y = a[1];
    var len = x*x + y*y;
    if (len > 0) {
      //TODO: evaluate use of glm_invsqrt here?
      len = 1 / Math.sqrt(len);
      out[0] = a[0] * len;
      out[1] = a[1] * len;
    }
    return out;
  }
  /**
   * Alias for {@link vec2.subtract}
   * @function
   */
  const sub = subtract;

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
    constructor({gl2, vwidth = 320, vheight = 200,textBitmap,memory,offset}) {

      this.gl2 = gl2;
      const gl = this.gl = gl2.gl;


      this.vwidth = vwidth;
      this.vheight = vheight;

      this.twidth = parseInt(vwidth / this.charSize);// テキストの横の文字数
      this.theight = parseInt(vheight / this.charSize);// テキストの縦の文字数

      this.blinkCount = 0;// ブリンク制御用
      this.blink = false;// ブリンク制御用

      this.textBuffer = new Uint32Array(memory,offset,parseInt(this.twidth * this.theight));// テキスト/アトリビュートVRAM
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

    static calc_memory_size(width , height){
      return width * height * 4;
    }
  }

  TextPlane.prototype.CENTER = Symbol('Center');
  TextPlane.prototype.LEFT = Symbol('LEFT');
  TextPlane.prototype.RIGHT = Symbol('RIGHT');
  TextPlane.prototype.charSize = 8;/* 文字サイズ pixel */

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
      this.TEXT_WIDTH = this.VIRTUAL_WIDTH / this.CHAR_SIZE | 0; 
      this.TEXT_HEIGHT = this.VIRTUAL_HEIGHT / this.CHAR_SIZE | 0;
      this.PIXEL_SIZE = 1;
      this.ACTUAL_CHAR_SIZE = this.CHAR_SIZE * this.PIXEL_SIZE;
      this.SPRITE_SIZE_X = 16.0;
      this.SPRITE_SIZE_Y = 16.0;
      this.CAMERA_Z = this.VIRTUAL_HEIGHT / (Math.tan(this.ANGLE_OF_VIEW / 360 * Math.PI) * 2);
      this.MEMORY_SIZE_NEEDED = TextPlane.calc_memory_size(this.TEXT_WIDTH,this.TEXT_HEIGHT);

      this.scale_ = 1.0;
      this.offset_ = create$2();

      this.renderer = null;
      this.stats = null;
      this.scene = null;
      this.camera = null;
      this.textPlane = null;
      this.position = this.POS_CENTER;
    }

    initConsole({textBitmap,memory,offset}) {

      this.gl = document.querySelector('#c').getContext('webgl2',{antialias:false});
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
      this.text = new TextPlane({gl2:gl2,vwidth:this.VIRTUAL_WIDTH,vheight:this.VIRTUAL_HEIGHT,textBitmap:textBitmap,memory:memory,offset:offset});
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
  //    this.map.render();
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
                  debugLog("(use default palette)");
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

#define root2 1.414213562373095

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

  v_diffuse = clamp(diffuse * ((512. - pos.z) / 256.0), 0.0, 1.0);
 
  v_color_index  = point_attrib & 0xffu;
  v_pallete_index = u_attrib & 0x1ffu;
 
  v_ambient = u_ambient;
  v_alpha = float((u_attrib & 0x3fc00u) >> 10u) / 255.0;

  gl_Position = pos;
  // セルサイズの計算（今のところかなりいい加減。。）
  gl_PointSize = clamp((256.0 / pos.z) * u_scale * root2,0.0,128.0);
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
  const VOX_OBJ_MAX = 256;

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
    constructor({ gl2, voxelModels,visible = true,memory,offset}) {
      super();
      // webgl コンテキストの保存
      const gl = this.gl = gl2.gl;
      this.gl2 = gl2;

      //let points = new DataView(new ArrayBuffer(4 * 4 * data.voxels.length));
      this.endian = checkEndian();
      this.voxScreenMemory = new DataView(memory,offset,this.MEMORY_SIZE_NEEDED);
      //his.voxScreenBuffer = new Uint8Array(memory,offset,this.MEMORY_SIZE_NEEDED);
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
      const vmemory = this.voxScreenMemory;
  //    let px = -70,count=1;

  //     for(let offset = 0,eo = vmemory.byteLength;offset < eo;offset += VOX_MEMORY_STRIDE){
  // //      vmemory.setUint32(offset + VOX_OBJ_ATTRIB,0x8003fc00 | count++ | ((count & 0x3) << 20),this.endian);
  //       vmemory.setUint32(offset + VOX_OBJ_ATTRIB,0x8003fc00 | count++ | (0),this.endian);
  //       vmemory.setFloat32(offset + VOX_OBJ_SCALE,Math.random() * 1.5,this.endian);
  //       vmemory.setFloat32(offset + VOX_OBJ_POS,Math.random() * 192 - 192 / 2,this.endian);
  //       vmemory.setFloat32(offset + VOX_OBJ_POS + SIZE_PARAM,Math.random() * 256 - 128,this.endian);
  //       vmemory.setFloat32(offset + VOX_OBJ_POS + SIZE_PARAM * 2,Math.random() * 192 ,this.endian);
  //       vmemory.setFloat32(offset + VOX_OBJ_ANGLE,count,this.endian);
  //     }

   
        
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
          let axis = new Float32Array(memory.buffer,memory.byteOffset + offset + VOX_OBJ_AXIS,3);
          set(axis,1,-1,-1);
          normalize(axis,axis);
          let c = memory.getFloat32(offset + VOX_OBJ_ANGLE,endian) + 0.04;
          memory.setFloat32(offset + VOX_OBJ_ANGLE,c,endian);
          setRotate(this.rotate,memory.getFloat32(offset + VOX_OBJ_ANGLE,endian),axis);

          gl.uniform1f(this.scaleLocation,memory.getFloat32(offset + VOX_OBJ_SCALE,endian));
          gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);
          gl.uniform3fv(this.objPositionLocation,new Float32Array(memory.buffer,memory.byteOffset + offset + VOX_OBJ_POS,3));

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

  Vox.prototype.MEMORY_SIZE_NEEDED = VOX_MEMORY_STRIDE * VOX_OBJ_MAX;
  Vox.prototype.SIZE_PARAM = SIZE_PARAM;
  Vox.prototype.VOX_OBJ_POS = VOX_OBJ_POS;
  Vox.prototype.VOX_OBJ_POS_SIZE = VOX_OBJ_POS_SIZE; // vec3
  Vox.prototype.VOX_OBJ_SCALE = VOX_OBJ_SCALE;
  Vox.prototype.VOX_OBJ_SCALE_SIZE = VOX_OBJ_SCALE_SIZE; // float
  Vox.prototype.VOX_OBJ_AXIS = VOX_OBJ_AXIS;
  Vox.prototype.VOX_OBJ_AXIS_SIZE = VOX_OBJ_AXIS_SIZE; // vec3
  Vox.prototype.VOX_OBJ_ANGLE = VOX_OBJ_ANGLE;
  Vox.prototype.VOX_OBJ_ANGLE_SIZE = VOX_OBJ_ANGLE_SIZE; // float
  Vox.prototype.VOX_OBJ_ATTRIB = VOX_OBJ_ATTRIB;
  Vox.prototype.VOX_OBJ_ATTRIB_SIZE = VOX_OBJ_ATTRIB_SIZE; // uint
  // アトリビュートのビット構成
  // v00n nnnn nnnn 00aa aaaa aadc cccc cccc
  // v: 1 ... 表示 0 ... 非表示
  // n: object No (0-511)
  // a: alpha (0-255)
  // c: color pallet index (0-511)
  // d: use default pallet;
  Vox.prototype.VOX_MEMORY_STRIDE =  VOX_MEMORY_STRIDE;
  Vox.prototype.VOX_OBJ_MAX = VOX_OBJ_MAX;

  const vertexShader$1 = `#version 300 es
precision highp float;
precision highp int;


// 座標 X,Y,Z
layout(location = 0) in vec2 position;

uniform vec2 u_offset;
uniform float u_scale;
uniform float u_aspect;
uniform mat3 u_rotate;
uniform float u_pointsize;

void main() {
  
  // 表示位置の計算
  vec4 pos = vec4(  u_rotate * vec3(
        vec2(
          (position.x + u_offset.x ) * u_scale,
           1.0  - (position.y + u_offset.y) * u_scale 
          ) 
      ,1.0)   
    ,1.0) ;

  pos.x *= u_aspect;
  //pos.z = 1.0;

  gl_Position = pos;
  gl_PointSize = u_pointsize;
}
`;

  const fragmentShader$1 = `#version 300 es
precision highp float;
precision highp int;

uniform vec4 u_color;

// 頂点シェーダーからの情報

// 出力色
out vec4 fcolor;

void main() {
  fcolor = u_color;
}
`;


  let tileWidth = 0.0013724960300966176 ;
  let tileHeight = 0.0011260210872360474;

  // プログラムを使いまわすためのキャッシュ
  let programCache$1;

  // エンディアンを調べる関数
  function checkEndian$1(buffer = new ArrayBuffer(2)) {

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
  class MapModel {
    constructor(feature){


      switch(feature.properties.class){
        case 'RdEdg':
          this.color = fromValues$1(1,1,1,0.5);
          this.pointSize = 1.0;
          this.drawType = 0;
          break;
        case 'BldL':
          this.color = fromValues$1(1,0.5,0,1.0);
          this.pointSize = 1.0;
          this.drawType = 0;
          break;
        case 'WL':
          this.color = fromValues$1(0,0,1,1.0);
          this.pointSize = 1.0;
          this.drawType = 0;
          break;
        case 'RdCompt':
          this.color = fromValues$1(1,1,1,0.8);
          this.pointSize = 1.0;
          this.drawType = 0;
          break;
        case 'RailCL':
          this.color = fromValues$1(0,1,0,0.7);
          this.pointSize = 1.0;
          this.drawType = 0;
          break;
        case 'ElevPt':
          this.color = fromValues$1(1,0,1,1);
          this.pointSize = 4.0;
          this.drawType = 1;
          break;
        case 'Cntr':
          this.color = fromValues$1(1,0,0,0.5);
          this.pointSize = 1.0;
          this.drawType = 0;
          break;
        case 'GCP':
          this.color = fromValues$1(1,0,0,1);
          this.pointSize = 4.0;
          this.drawType = 1;
          break;
        default:
          this.color = fromValues$1(1,1,1,0.3);
          this.pointSize = 1.0;
          this.drawType = 0;
          break;
      }

      this.offset = MapModel.offset_;
      const pointList = feature.geometry.coordinates;
      switch(feature.geometry.type){
        case 'LineString':
          this.size = pointList.length;
          pointList.forEach(d=>{
            MapModel.points.push(d[0]);
            MapModel.points.push(d[1]);
          });
          MapModel.offset_ += pointList.length;
          break;
        case 'Point':
          this.size = 1;
          MapModel.points.push(d[0]);
          MapModel.points.push(d[1]);
          MapModel.offset_ += 1;
          break;
      }

    }

    static async load(url = './merged.json'){
      let mapModels = await (await fetch(url)).json();
      tileWidth = mapModels.attributes.avgWidth;
      tileHeight = mapModels.attributes.avgHeight;
      mapModels = mapModels.maps.map((featureCollestion)=>{
  //      let features = featureCollestion.features.filter(f=>(f.properties.class == 'BldL' || f.properties.class.match(/Rd/)));
        let features = featureCollestion.features;//.filter(f=>(f.properties.class == "ElevPt"));
        features = features.map(feature=>{
          return new MapModel(feature);
        });

        return {
          attributes:featureCollestion.attributes,
          features:features
        };
      });
      return mapModels;
    }

  }

  MapModel.POINT_DATA_SIZE = 4 * 2;
  MapModel.points = [];
  MapModel.offset_ = 0;

  function setRotate$1(mat3 ,angle,  axis){

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


  class Map$1 extends Node {
    constructor({ gl2, mapModels,visible = true}) {
      super();
      // webgl コンテキストの保存
      const gl = this.gl = gl2.gl;
      this.gl2 = gl2;

      this.endian = checkEndian$1();
      this.bufferData = new Float32Array(MapModel.points);
      this.mapModels = mapModels;
        
      // スプライト面の表示・非表示
      this.visible = visible;

      // プログラムの生成
      if (!programCache$1) {
        programCache$1 = gl2.createProgram(vertexShader$1, fragmentShader$1);
      }

      const program = this.program = programCache$1;

      // アトリビュート
      // VAOの生成とバインド
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      // VBOの生成
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.bufferData.buffer, gl.DYNAMIC_DRAW);

      // 属性ロケーションIDの取得と保存
      this.positionLocation = 0;
      this.stride = 8;

      // 属性の有効化とシェーダー属性とバッファ位置の結び付け
      // 位置
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, true, this.stride, 0);

      gl.bindVertexArray(null);

      // uniform変数の位置の取得と保存
      // 
      this.offsetLocation = gl.getUniformLocation(program,'u_offset');
      this.scaleLocation = gl.getUniformLocation(program,'u_scale');
      this.aspectLocation = gl.getUniformLocation(program,'u_aspect');
      
      this.rotateLocation = gl.getUniformLocation(program,'u_rotate');
      this.rotate = create();
      this.axis = fromValues(0,0,1);
      
      this.y = -34.666;
      this.x = -135.50055;

      this.colorLocation = gl.getUniformLocation(program,'u_color');
      this.pointSizeLocation = gl.getUniformLocation(program,'u_pointsize');
      //gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);

    }

    // スプライトを描画
    render(screen) {
      const gl = this.gl;

      // プログラムの指定
      gl.useProgram(this.program);

      // VAOをバインド
      gl.bindVertexArray(this.vao);
      const hw = (tileWidth / 256.0 * screen.console.VIRTUAL_WIDTH) / 2 ;
      const hh = (tileHeight / 256.0 * screen.console.VIRTUAL_HEIGHT) / 2;
      let ox = this.x - hw / 5 ;
      let oy = this.y - hh ;
      const left = ox - hw * 2,right = ox + hw * 2,top = oy - hh * 4,bottom = oy + hh * 4 ;
      setRotate$1(this.rotate,this.angle - Math.PI / 2,this.axis);
      const aspect=  screen.console.VIRTUAL_HEIGHT / screen.console.VIRTUAL_WIDTH;
      const scale = 1500;
      // カラーパレットをバインド
      for(const featureCollection of this.mapModels){
        const attr = featureCollection.attributes;
        if(left <= attr.xmax && attr.xmin <= right && top <= attr.ymax && attr.ymin <= bottom){
          for(const obj of featureCollection.features){
            gl.uniform1f(this.scaleLocation,scale);
            gl.uniform1f(this.aspectLocation,aspect);
            gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);
            gl.uniform4fv(this.colorLocation,obj.color);
            gl.uniform1f(this.pointSizeLocation,obj.pointSize || 1.0);
            gl.uniform2f(this.offsetLocation,-ox,-oy);
                      
            gl.drawArrays(obj.drawType == 0 ? gl.LINE_STRIP : gl.POINTS, obj.offset,obj.size);
  //          gl.drawArrays(gl.TRIANGLE_FAN, obj.offset,obj.size);
          }
        }
      }
  //    this.y -= 0.0000015; 
    }
  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(compare) {
    if (compare.length === 1) compare = ascendingComparator(compare);
    return {
      left: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      }
    };
  }

  function ascendingComparator(f) {
    return function(d, x) {
      return ascending(f(d), x);
    };
  }

  var ascendingBisect = bisector(ascending);

  var noop = {value: function() {}};

  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }

  function Dispatch(_) {
    this._ = _;
  }

  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {type: t, name: name};
    });
  }

  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._,
          T = parseTypenames(typename + "", _),
          t,
          i = -1,
          n = T.length;

      // If no callback was specified, return the callback of the given type and name.
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }

      // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
      }

      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };

  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set$1(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  var xhtml = "http://www.w3.org/1999/xhtml";

  var namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
  }

  function creatorInherit(name) {
    return function() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml && document.documentElement.namespaceURI === xhtml
          ? document.createElement(name)
          : document.createElementNS(uri, name);
    };
  }

  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local
        ? creatorFixed
        : creatorInherit)(fullname);
  }

  function none() {}

  function selector(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select(select) {
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function empty() {
    return [];
  }

  function selectorAll(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  function selection_selectAll(select) {
    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection(subgroups, parents);
  }

  function matcher(selector) {
    return function() {
      return this.matches(selector);
    };
  }

  function selection_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse(update) {
    return new Array(update.length);
  }

  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }

  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
    querySelector: function(selector) { return this._parent.querySelector(selector); },
    querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
  };

  function constant(x) {
    return function() {
      return x;
    };
  }

  var keyPrefix = "$"; // Protect against keys like “__proto__”.

  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length;

    // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Put any non-null nodes that don’t fit into exit.
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = {},
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue;

    // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
        if (keyValue in nodeByKeyValue) {
          exit[i] = node;
        } else {
          nodeByKeyValue[keyValue] = node;
        }
      }
    }

    // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.
    for (i = 0; i < dataLength; ++i) {
      keyValue = keyPrefix + key.call(parent, data[i], i, data);
      if (node = nodeByKeyValue[keyValue]) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue[keyValue] = null;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Add any remaining nodes that were not bound to data to exit.
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
        exit[i] = node;
      }
    }
  }

  function selection_data(value, key) {
    if (!value) {
      data = new Array(this.size()), j = -1;
      this.each(function(d) { data[++j] = d; });
      return data;
    }

    var bind = key ? bindKey : bindIndex,
        parents = this._parents,
        groups = this._groups;

    if (typeof value !== "function") value = constant(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = value.call(parent, parent && parent.__data__, j, parents),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);

      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

      // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength);
          previous._next = next || null;
        }
      }
    }

    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_join(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
    if (onupdate != null) update = onupdate(update);
    if (onexit == null) exit.remove(); else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge(selection) {

    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection(merges, this._parents);
  }

  function selection_order() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort(compare) {
    if (!compare) compare = ascending$1;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }

    return new Selection(sortgroups, this._parents).order();
  }

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes() {
    var nodes = new Array(this.size()), i = -1;
    this.each(function() { nodes[++i] = this; });
    return nodes;
  }

  function selection_node() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size() {
    var size = 0;
    this.each(function() { ++size; });
    return size;
  }

  function selection_empty() {
    return !this.node();
  }

  function selection_each(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr(name, value) {
    var fullname = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local
          ? node.getAttributeNS(fullname.space, fullname.local)
          : node.getAttribute(fullname);
    }

    return this.each((value == null
        ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
        ? (fullname.local ? attrFunctionNS : attrFunction)
        : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
  }

  function defaultView(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove : typeof value === "function"
              ? styleFunction
              : styleConstant)(name, value, priority == null ? "" : priority))
        : styleValue(this.node(), name);
  }

  function styleValue(node, name) {
    return node.style.getPropertyValue(name)
        || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }

  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }

  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }

  function selection_property(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove : typeof value === "function"
            ? propertyFunction
            : propertyConstant)(name, value))
        : this.node()[name];
  }

  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList(node) {
    return node.classList || new ClassList(node);
  }

  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }

  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }

  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }

  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }

  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }

  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }

  function selection_classed(name, value) {
    var names = classArray(name + "");

    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }

    return this.each((typeof value === "function"
        ? classedFunction : value
        ? classedTrue
        : classedFalse)(names, value));
  }

  function textRemove() {
    this.textContent = "";
  }

  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove : (typeof value === "function"
            ? textFunction
            : textConstant)(value))
        : this.node().textContent;
  }

  function htmlRemove() {
    this.innerHTML = "";
  }

  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }

  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove : (typeof value === "function"
            ? htmlFunction
            : htmlConstant)(value))
        : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise() {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower() {
    return this.each(lower);
  }

  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove() {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

  var filterEvents = {};

  if (typeof document !== "undefined") {
    var element = document.documentElement;
    if (!("onmouseenter" in element)) {
      filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
    }
  }

  function filterContextListener(listener, index, group) {
    listener = contextListener(listener, index, group);
    return function(event) {
      var related = event.relatedTarget;
      if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
        listener.call(this, event);
      }
    };
  }

  function contextListener(listener, index, group) {
    return function(event1) {
      try {
        listener.call(this, this.__data__, index, group);
      } finally {
      }
    };
  }

  function parseTypenames$1(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {type: t, name: name};
    });
  }

  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }

  function onAdd(typename, value, capture) {
    var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
    return function(d, i, group) {
      var on = this.__on, o, listener = wrap(value, i, group);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
          this.addEventListener(o.type, o.listener = listener, o.capture = capture);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, capture);
      o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }

  function selection_on(typename, value, capture) {
    var typenames = parseTypenames$1(typename + ""), i, n = typenames.length, t;

    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd : onRemove;
    if (capture == null) capture = false;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
    return this;
  }

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }

  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction
        : dispatchConstant)(type, params));
  }

  var root = [null];

  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  function selection() {
    return new Selection([[document.documentElement]], root);
  }

  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch
  };

  function define(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }

  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  function Color() {}

  var darker = 0.7;
  var brighter = 1 / darker;

  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex = /^#([0-9a-f]{3,8})$/,
      reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
      reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
      reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
      reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
      reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
      reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

  var named = {
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgreen: 0x006400,
    darkgrey: 0xa9a9a9,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    grey: 0x808080,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightgrey: 0xd3d3d3,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32
  };

  define(Color, color, {
    copy: function(channels) {
      return Object.assign(new this.constructor, this, channels);
    },
    displayable: function() {
      return this.rgb().displayable();
    },
    hex: color_formatHex, // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });

  function color_formatHex() {
    return this.rgb().formatHex();
  }

  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }

  function color_formatRgb() {
    return this.rgb().formatRgb();
  }

  function color(format) {
    var m, l;
    format = (format + "").trim().toLowerCase();
    return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
        : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
        : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
        : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
        : null) // invalid hex
        : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
        : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
        : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
        : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
        : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
        : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
        : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
        : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
        : null;
  }

  function rgbn(n) {
    return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
  }

  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }

  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb;
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }

  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }

  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Rgb, rgb, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb: function() {
      return this;
    },
    displayable: function() {
      return (-0.5 <= this.r && this.r < 255.5)
          && (-0.5 <= this.g && this.g < 255.5)
          && (-0.5 <= this.b && this.b < 255.5)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex, // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));

  function rgb_formatHex() {
    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
  }

  function rgb_formatRgb() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(")
        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
        + (a === 1 ? ")" : ", " + a + ")");
  }

  function hex(value) {
    value = Math.max(0, Math.min(255, Math.round(value) || 0));
    return (value < 16 ? "0" : "") + value.toString(16);
  }

  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }

  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl;
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        h = NaN,
        s = max - min,
        l = (max + min) / 2;
    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;
      else if (g === max) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }

  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }

  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Hsl, hsl, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < 0.5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    displayable: function() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s))
          && (0 <= this.l && this.l <= 1)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl: function() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "hsl(" : "hsla(")
          + (this.h || 0) + ", "
          + (this.s || 0) * 100 + "%, "
          + (this.l || 0) * 100 + "%"
          + (a === 1 ? ")" : ", " + a + ")");
    }
  }));

  /* From FvD 13.37, CSS Color Module Level 3 */
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60
        : h < 180 ? m2
        : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
        : m1) * 255;
  }

  var deg2rad = Math.PI / 180;
  var rad2deg = 180 / Math.PI;

  // https://observablehq.com/@mbostock/lab-and-rgb
  var K = 18,
      Xn = 0.96422,
      Yn = 1,
      Zn = 0.82521,
      t0 = 4 / 29,
      t1 = 6 / 29,
      t2 = 3 * t1 * t1,
      t3 = t1 * t1 * t1;

  function labConvert(o) {
    if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
    if (o instanceof Hcl) return hcl2lab(o);
    if (!(o instanceof Rgb)) o = rgbConvert(o);
    var r = rgb2lrgb(o.r),
        g = rgb2lrgb(o.g),
        b = rgb2lrgb(o.b),
        y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
    if (r === g && g === b) x = z = y; else {
      x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
      z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
    }
    return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
  }

  function lab(l, a, b, opacity) {
    return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
  }

  function Lab(l, a, b, opacity) {
    this.l = +l;
    this.a = +a;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Lab, lab, extend(Color, {
    brighter: function(k) {
      return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
    },
    darker: function(k) {
      return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
    },
    rgb: function() {
      var y = (this.l + 16) / 116,
          x = isNaN(this.a) ? y : y + this.a / 500,
          z = isNaN(this.b) ? y : y - this.b / 200;
      x = Xn * lab2xyz(x);
      y = Yn * lab2xyz(y);
      z = Zn * lab2xyz(z);
      return new Rgb(
        lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
        lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
        lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
        this.opacity
      );
    }
  }));

  function xyz2lab(t) {
    return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
  }

  function lab2xyz(t) {
    return t > t1 ? t * t * t : t2 * (t - t0);
  }

  function lrgb2rgb(x) {
    return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  }

  function rgb2lrgb(x) {
    return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }

  function hclConvert(o) {
    if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
    if (!(o instanceof Lab)) o = labConvert(o);
    if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
    var h = Math.atan2(o.b, o.a) * rad2deg;
    return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
  }

  function hcl(h, c, l, opacity) {
    return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
  }

  function Hcl(h, c, l, opacity) {
    this.h = +h;
    this.c = +c;
    this.l = +l;
    this.opacity = +opacity;
  }

  function hcl2lab(o) {
    if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
    var h = o.h * deg2rad;
    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
  }

  define(Hcl, hcl, extend(Color, {
    brighter: function(k) {
      return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
    },
    darker: function(k) {
      return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
    },
    rgb: function() {
      return hcl2lab(this).rgb();
    }
  }));

  var A = -0.14861,
      B = +1.78277,
      C = -0.29227,
      D = -0.90649,
      E = +1.97294,
      ED = E * D,
      EB = E * B,
      BC_DA = B * C - D * A;

  function cubehelixConvert(o) {
    if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Rgb)) o = rgbConvert(o);
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
        bl = b - l,
        k = (E * (g - l) - C * bl) / D,
        s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
        h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
    return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
  }

  function cubehelix(h, s, l, opacity) {
    return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
  }

  function Cubehelix(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Cubehelix, cubehelix, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
          l = +this.l,
          a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
          cosh = Math.cos(h),
          sinh = Math.sin(h);
      return new Rgb(
        255 * (l + a * (A * cosh + B * sinh)),
        255 * (l + a * (C * cosh + D * sinh)),
        255 * (l + a * (E * cosh)),
        this.opacity
      );
    }
  }));

  function basis(t1, v0, v1, v2, v3) {
    var t2 = t1 * t1, t3 = t2 * t1;
    return ((1 - 3 * t1 + 3 * t2 - t3) * v0
        + (4 - 6 * t2 + 3 * t3) * v1
        + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
        + t3 * v3) / 6;
  }

  function basis$1(values) {
    var n = values.length - 1;
    return function(t) {
      var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
          v1 = values[i],
          v2 = values[i + 1],
          v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
          v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  function constant$1(x) {
    return function() {
      return x;
    };
  }

  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }

  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }

  function hue(a, b) {
    var d = b - a;
    return d ? linear(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant$1(isNaN(a) ? b : a);
  }

  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
    };
  }

  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant$1(isNaN(a) ? b : a);
  }

  var interpolateRgb = (function rgbGamma(y) {
    var color = gamma(y);

    function rgb$1(start, end) {
      var r = color((start = rgb(start)).r, (end = rgb(end)).r),
          g = color(start.g, end.g),
          b = color(start.b, end.b),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.r = r(t);
        start.g = g(t);
        start.b = b(t);
        start.opacity = opacity(t);
        return start + "";
      };
    }

    rgb$1.gamma = rgbGamma;

    return rgb$1;
  })(1);

  function rgbSpline(spline) {
    return function(colors) {
      var n = colors.length,
          r = new Array(n),
          g = new Array(n),
          b = new Array(n),
          i, color;
      for (i = 0; i < n; ++i) {
        color = rgb(colors[i]);
        r[i] = color.r || 0;
        g[i] = color.g || 0;
        b[i] = color.b || 0;
      }
      r = spline(r);
      g = spline(g);
      b = spline(b);
      color.opacity = 1;
      return function(t) {
        color.r = r(t);
        color.g = g(t);
        color.b = b(t);
        return color + "";
      };
    };
  }

  var rgbBasis = rgbSpline(basis$1);

  function interpolateNumber(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

  function zero(b) {
    return function() {
      return b;
    };
  }

  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }

  function interpolateString(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
        am, // current match in a
        bm, // current match in b
        bs, // string preceding current number in b, if any
        i = -1, // index in s
        s = [], // string constants and placeholders
        q = []; // number interpolators

    // Coerce inputs to strings.
    a = a + "", b = b + "";

    // Interpolate pairs of numbers in a & b.
    while ((am = reA.exec(a))
        && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) { // a string precedes the next number in b
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
        if (s[i]) s[i] += bm; // coalesce with previous string
        else s[++i] = bm;
      } else { // interpolate non-matching numbers
        s[++i] = null;
        q.push({i: i, x: interpolateNumber(am, bm)});
      }
      bi = reB.lastIndex;
    }

    // Add remains of b.
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }

    // Special optimization for only a single match.
    // Otherwise, interpolate each of the numbers and rejoin the string.
    return s.length < 2 ? (q[0]
        ? one(q[0].x)
        : zero(b))
        : (b = q.length, function(t) {
            for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
            return s.join("");
          });
  }

  var degrees = 180 / Math.PI;

  var identity$1 = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };

  function decompose(a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX: scaleX,
      scaleY: scaleY
    };
  }

  var cssNode,
      cssRoot,
      cssView,
      svgNode;

  function parseCss(value) {
    if (value === "none") return identity$1;
    if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
    cssNode.style.transform = value;
    value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
    cssRoot.removeChild(cssNode);
    value = value.slice(7, -1).split(",");
    return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
  }

  function parseSvg(value) {
    if (value == null) return identity$1;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity$1;
    value = value.matrix;
    return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  function interpolateTransform(parse, pxComma, pxParen, degParen) {

    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }

    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }

    function rotate(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
        q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }

    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }

    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }

    return function(a, b) {
      var s = [], // string constants and placeholders
          q = []; // number interpolators
      a = parse(a), b = parse(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null; // gc
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n) s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }

  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  function cubehelix$1(hue) {
    return (function cubehelixGamma(y) {
      y = +y;

      function cubehelix$1(start, end) {
        var h = hue((start = cubehelix(start)).h, (end = cubehelix(end)).h),
            s = nogamma(start.s, end.s),
            l = nogamma(start.l, end.l),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.h = h(t);
          start.s = s(t);
          start.l = l(Math.pow(t, y));
          start.opacity = opacity(t);
          return start + "";
        };
      }

      cubehelix$1.gamma = cubehelixGamma;

      return cubehelix$1;
    })(1);
  }

  cubehelix$1(hue);
  var cubehelixLong = cubehelix$1(nogamma);

  var frame = 0, // is an animation frame pending?
      timeout = 0, // is a timeout pending?
      interval = 0, // are any timers active?
      pokeDelay = 1000, // how frequently we check for clock skew
      taskHead,
      taskTail,
      clockLast = 0,
      clockNow = 0,
      clockSkew = 0,
      clock = typeof performance === "object" && performance.now ? performance : Date,
      setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }

  function clearNow() {
    clockNow = 0;
  }

  function Timer() {
    this._call =
    this._time =
    this._next = null;
  }

  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };

  function timer(callback, delay, time) {
    var t = new Timer;
    t.restart(callback, delay, time);
    return t;
  }

  function timerFlush() {
    now(); // Get the current time, if not already set.
    ++frame; // Pretend we’ve set an alarm, if we haven’t already.
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
      t = t._next;
    }
    --frame;
  }

  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }

  function poke() {
    var now = clock.now(), delay = now - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
  }

  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }

  function sleep(time) {
    if (frame) return; // Soonest alarm already set, or will be.
    if (timeout) timeout = clearTimeout(timeout);
    var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
    if (delay > 24) {
      if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  function timeout$1(callback, delay, time) {
    var t = new Timer;
    delay = delay == null ? 0 : +delay;
    t.restart(function(elapsed) {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  var emptyOn = dispatch("start", "end", "cancel", "interrupt");
  var emptyTween = [];

  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;

  function schedule(node, name, id, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id in schedules) return;
    create$6(node, id, {
      name: name,
      index: index, // For context during callback.
      group: group, // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }

  function init(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }

  function set$2(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }

  function get$1(node, id) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
    return schedule;
  }

  function create$6(node, id, self) {
    var schedules = node.__transition,
        tween;

    // Initialize the self timer when the transition is created.
    // Note the actual delay is not known until the first callback!
    schedules[id] = self;
    self.timer = timer(schedule, 0, self.time);

    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start, self.delay, self.time);

      // If the elapsed delay is less than our first sleep, start immediately.
      if (self.delay <= elapsed) start(elapsed - self.delay);
    }

    function start(elapsed) {
      var i, j, n, o;

      // If the state is not SCHEDULED, then we previously errored on start.
      if (self.state !== SCHEDULED) return stop();

      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self.name) continue;

        // While this element already has a starting transition during this frame,
        // defer starting an interrupting transition until that transition has a
        // chance to tick (and possibly end); see d3/d3-transition#54!
        if (o.state === STARTED) return timeout$1(start);

        // Interrupt the active transition, if any.
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }

        // Cancel any pre-empted transitions.
        else if (+i < id) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }

      // Defer the first tick to end of the current frame; see d3/d3#1576.
      // Note the transition may be canceled after start and before the first tick!
      // Note this must be scheduled before the start event; see d3/d3-transition#16!
      // Assuming this is successful, subsequent callbacks go straight to tick.
      timeout$1(function() {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      });

      // Dispatch the start event.
      // Note this must be done before the tween are initialized.
      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING) return; // interrupted
      self.state = STARTED;

      // Initialize the tween, deleting null tween.
      tween = new Array(n = self.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }

    function tick(elapsed) {
      var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
          i = -1,
          n = tween.length;

      while (++i < n) {
        tween[i].call(node, t);
      }

      // Dispatch the end event.
      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }

    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id];
      for (var i in schedules) return; // eslint-disable-line no-unused-vars
      delete node.__transition;
    }
  }

  function interrupt(node, name) {
    var schedules = node.__transition,
        schedule,
        active,
        empty = true,
        i;

    if (!schedules) return;

    name = name == null ? null : name + "";

    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }

    if (empty) delete node.__transition;
  }

  function selection_interrupt(name) {
    return this.each(function() {
      interrupt(this, name);
    });
  }

  function tweenRemove(id, name) {
    var tween0, tween1;
    return function() {
      var schedule = set$2(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }

      schedule.tween = tween1;
    };
  }

  function tweenFunction(id, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error;
    return function() {
      var schedule = set$2(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n) tween1.push(t);
      }

      schedule.tween = tween1;
    };
  }

  function transition_tween(name, value) {
    var id = this._id;

    name += "";

    if (arguments.length < 2) {
      var tween = get$1(this.node(), id).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }
      return null;
    }

    return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
  }

  function tweenValue(transition, name, value) {
    var id = transition._id;

    transition.each(function() {
      var schedule = set$2(this, id);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });

    return function(node) {
      return get$1(node, id).value[name];
    };
  }

  function interpolate(a, b) {
    var c;
    return (typeof b === "number" ? interpolateNumber
        : b instanceof color ? interpolateRgb
        : (c = color(b)) ? (b = c, interpolateRgb)
        : interpolateString)(a, b);
  }

  function attrRemove$1(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS$1(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrConstantNS$1(fullname, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function attrFunctionNS$1(fullname, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function transition_attr(name, value) {
    var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
    return this.attrTween(name, typeof value === "function"
        ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
        : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
        : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
  }

  function attrInterpolate(name, i) {
    return function(t) {
      this.setAttribute(name, i.call(this, t));
    };
  }

  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }

  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function transition_attrTween(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    var fullname = namespace(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  function delayFunction(id, value) {
    return function() {
      init(this, id).delay = +value.apply(this, arguments);
    };
  }

  function delayConstant(id, value) {
    return value = +value, function() {
      init(this, id).delay = value;
    };
  }

  function transition_delay(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? delayFunction
            : delayConstant)(id, value))
        : get$1(this.node(), id).delay;
  }

  function durationFunction(id, value) {
    return function() {
      set$2(this, id).duration = +value.apply(this, arguments);
    };
  }

  function durationConstant(id, value) {
    return value = +value, function() {
      set$2(this, id).duration = value;
    };
  }

  function transition_duration(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? durationFunction
            : durationConstant)(id, value))
        : get$1(this.node(), id).duration;
  }

  function easeConstant(id, value) {
    if (typeof value !== "function") throw new Error;
    return function() {
      set$2(this, id).ease = value;
    };
  }

  function transition_ease(value) {
    var id = this._id;

    return arguments.length
        ? this.each(easeConstant(id, value))
        : get$1(this.node(), id).ease;
  }

  function transition_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  function transition_merge(transition) {
    if (transition._id !== this._id) throw new Error;

    for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Transition(merges, this._parents, this._name, this._id);
  }

  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }

  function onFunction(id, name, listener) {
    var on0, on1, sit = start(name) ? init : set$2;
    return function() {
      var schedule = sit(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

      schedule.on = on1;
    };
  }

  function transition_on(name, listener) {
    var id = this._id;

    return arguments.length < 2
        ? get$1(this.node(), id).on.on(name)
        : this.each(onFunction(id, name, listener));
  }

  function removeFunction(id) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id) return;
      if (parent) parent.removeChild(this);
    };
  }

  function transition_remove() {
    return this.on("end.remove", removeFunction(this._id));
  }

  function transition_select(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
        }
      }
    }

    return new Transition(subgroups, this._parents, name, id);
  }

  function transition_selectAll(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children = select.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
            if (child = children[k]) {
              schedule(child, name, id, k, children, inherit);
            }
          }
          subgroups.push(children);
          parents.push(node);
        }
      }
    }

    return new Transition(subgroups, parents, name, id);
  }

  var Selection$1 = selection.prototype.constructor;

  function transition_selection() {
    return new Selection$1(this._groups, this._parents);
  }

  function styleNull(name, interpolate) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue(this, name),
          string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }

  function styleRemove$1(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function styleFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue(this, name),
          value1 = value(this),
          string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function styleMaybeRemove(id, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
    return function() {
      var schedule = set$2(this, id),
          on = schedule.on,
          listener = schedule.value[key] == null ? remove || (remove = styleRemove$1(name)) : undefined;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

      schedule.on = on1;
    };
  }

  function transition_style(name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
    return value == null ? this
        .styleTween(name, styleNull(name, i))
        .on("end.style." + name, styleRemove$1(name))
      : typeof value === "function" ? this
        .styleTween(name, styleFunction$1(name, i, tweenValue(this, "style." + name, value)))
        .each(styleMaybeRemove(this._id, name))
      : this
        .styleTween(name, styleConstant$1(name, i, value), priority)
        .on("end.style." + name, null);
  }

  function styleInterpolate(name, i, priority) {
    return function(t) {
      this.style.setProperty(name, i.call(this, t), priority);
    };
  }

  function styleTween(name, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }

  function transition_styleTween(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  function textConstant$1(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction$1(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }

  function transition_text(value) {
    return this.tween("text", typeof value === "function"
        ? textFunction$1(tweenValue(this, "text", value))
        : textConstant$1(value == null ? "" : value + ""));
  }

  function textInterpolate(i) {
    return function(t) {
      this.textContent = i.call(this, t);
    };
  }

  function textTween(value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function transition_textTween(value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, textTween(value));
  }

  function transition_transition() {
    var name = this._name,
        id0 = this._id,
        id1 = newId();

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit = get$1(node, id0);
          schedule(node, name, id1, i, group, {
            time: inherit.time + inherit.delay + inherit.duration,
            delay: 0,
            duration: inherit.duration,
            ease: inherit.ease
          });
        }
      }
    }

    return new Transition(groups, this._parents, name, id1);
  }

  function transition_end() {
    var on0, on1, that = this, id = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = {value: reject},
          end = {value: function() { if (--size === 0) resolve(); }};

      that.each(function() {
        var schedule = set$2(this, id),
            on = schedule.on;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }

        schedule.on = on1;
      });
    });
  }

  var id = 0;

  function Transition(groups, parents, name, id) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id;
  }

  function transition(name) {
    return selection().transition(name);
  }

  function newId() {
    return ++id;
  }

  var selection_prototype = selection.prototype;

  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: transition_select,
    selectAll: transition_selectAll,
    filter: transition_filter,
    merge: transition_merge,
    selection: transition_selection,
    transition: transition_transition,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: transition_on,
    attr: transition_attr,
    attrTween: transition_attrTween,
    style: transition_style,
    styleTween: transition_styleTween,
    text: transition_text,
    textTween: transition_textTween,
    remove: transition_remove,
    tween: transition_tween,
    delay: transition_delay,
    duration: transition_duration,
    ease: transition_ease,
    end: transition_end
  };

  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  var defaultTiming = {
    time: null, // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };

  function inherit(node, id) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id])) {
      if (!(node = node.parentNode)) {
        return defaultTiming.time = now(), defaultTiming;
      }
    }
    return timing;
  }

  function selection_transition(name) {
    var id,
        timing;

    if (name instanceof Transition) {
      id = name._id, name = name._name;
    } else {
      id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule(node, name, id, i, group, timing || inherit(node, id));
        }
      }
    }

    return new Transition(groups, this._parents, name, id);
  }

  selection.prototype.interrupt = selection_interrupt;
  selection.prototype.transition = selection_transition;

  var prefix$1 = "$";

  function Map$2() {}

  Map$2.prototype = map.prototype = {
    constructor: Map$2,
    has: function(key) {
      return (prefix$1 + key) in this;
    },
    get: function(key) {
      return this[prefix$1 + key];
    },
    set: function(key, value) {
      this[prefix$1 + key] = value;
      return this;
    },
    remove: function(key) {
      var property = prefix$1 + key;
      return property in this && delete this[property];
    },
    clear: function() {
      for (var property in this) if (property[0] === prefix$1) delete this[property];
    },
    keys: function() {
      var keys = [];
      for (var property in this) if (property[0] === prefix$1) keys.push(property.slice(1));
      return keys;
    },
    values: function() {
      var values = [];
      for (var property in this) if (property[0] === prefix$1) values.push(this[property]);
      return values;
    },
    entries: function() {
      var entries = [];
      for (var property in this) if (property[0] === prefix$1) entries.push({key: property.slice(1), value: this[property]});
      return entries;
    },
    size: function() {
      var size = 0;
      for (var property in this) if (property[0] === prefix$1) ++size;
      return size;
    },
    empty: function() {
      for (var property in this) if (property[0] === prefix$1) return false;
      return true;
    },
    each: function(f) {
      for (var property in this) if (property[0] === prefix$1) f(this[property], property.slice(1), this);
    }
  };

  function map(object, f) {
    var map = new Map$2;

    // Copy constructor.
    if (object instanceof Map$2) object.each(function(value, key) { map.set(key, value); });

    // Index array by numeric index or specified key function.
    else if (Array.isArray(object)) {
      var i = -1,
          n = object.length,
          o;

      if (f == null) while (++i < n) map.set(i, object[i]);
      else while (++i < n) map.set(f(o = object[i], i, object), o);
    }

    // Convert object to map.
    else if (object) for (var key in object) map.set(key, object[key]);

    return map;
  }

  function Set() {}

  var proto = map.prototype;

  Set.prototype = set$3.prototype = {
    constructor: Set,
    has: proto.has,
    add: function(value) {
      value += "";
      this[prefix$1 + value] = value;
      return this;
    },
    remove: proto.remove,
    clear: proto.clear,
    values: proto.keys,
    size: proto.size,
    empty: proto.empty,
    each: proto.each
  };

  function set$3(object, f) {
    var set = new Set;

    // Copy constructor.
    if (object instanceof Set) object.each(function(value) { set.add(value); });

    // Otherwise, assume it’s an array.
    else if (object) {
      var i = -1, n = object.length;
      if (f == null) while (++i < n) set.add(object[i]);
      else while (++i < n) set.add(f(object[i], i, object));
    }

    return set;
  }

  var EOL = {},
      EOF = {},
      QUOTE = 34,
      NEWLINE = 10,
      RETURN = 13;

  function objectConverter(columns) {
    return new Function("d", "return {" + columns.map(function(name, i) {
      return JSON.stringify(name) + ": d[" + i + "] || \"\"";
    }).join(",") + "}");
  }

  function customConverter(columns, f) {
    var object = objectConverter(columns);
    return function(row, i) {
      return f(object(row), i, columns);
    };
  }

  // Compute unique columns in order of discovery.
  function inferColumns(rows) {
    var columnSet = Object.create(null),
        columns = [];

    rows.forEach(function(row) {
      for (var column in row) {
        if (!(column in columnSet)) {
          columns.push(columnSet[column] = column);
        }
      }
    });

    return columns;
  }

  function pad(value, width) {
    var s = value + "", length = s.length;
    return length < width ? new Array(width - length + 1).join(0) + s : s;
  }

  function formatYear(year) {
    return year < 0 ? "-" + pad(-year, 6)
      : year > 9999 ? "+" + pad(year, 6)
      : pad(year, 4);
  }

  function formatDate(date) {
    var hours = date.getUTCHours(),
        minutes = date.getUTCMinutes(),
        seconds = date.getUTCSeconds(),
        milliseconds = date.getUTCMilliseconds();
    return isNaN(date) ? "Invalid Date"
        : formatYear(date.getUTCFullYear()) + "-" + pad(date.getUTCMonth() + 1, 2) + "-" + pad(date.getUTCDate(), 2)
        + (milliseconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3) + "Z"
        : seconds ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "Z"
        : minutes || hours ? "T" + pad(hours, 2) + ":" + pad(minutes, 2) + "Z"
        : "");
  }

  function dsvFormat(delimiter) {
    var reFormat = new RegExp("[\"" + delimiter + "\n\r]"),
        DELIMITER = delimiter.charCodeAt(0);

    function parse(text, f) {
      var convert, columns, rows = parseRows(text, function(row, i) {
        if (convert) return convert(row, i - 1);
        columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
      });
      rows.columns = columns || [];
      return rows;
    }

    function parseRows(text, f) {
      var rows = [], // output rows
          N = text.length,
          I = 0, // current character index
          n = 0, // current line number
          t, // current token
          eof = N <= 0, // current token followed by EOF?
          eol = false; // current token followed by EOL?

      // Strip the trailing newline.
      if (text.charCodeAt(N - 1) === NEWLINE) --N;
      if (text.charCodeAt(N - 1) === RETURN) --N;

      function token() {
        if (eof) return EOF;
        if (eol) return eol = false, EOL;

        // Unescape quotes.
        var i, j = I, c;
        if (text.charCodeAt(j) === QUOTE) {
          while (I++ < N && text.charCodeAt(I) !== QUOTE || text.charCodeAt(++I) === QUOTE);
          if ((i = I) >= N) eof = true;
          else if ((c = text.charCodeAt(I++)) === NEWLINE) eol = true;
          else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
          return text.slice(j + 1, i - 1).replace(/""/g, "\"");
        }

        // Find next delimiter or newline.
        while (I < N) {
          if ((c = text.charCodeAt(i = I++)) === NEWLINE) eol = true;
          else if (c === RETURN) { eol = true; if (text.charCodeAt(I) === NEWLINE) ++I; }
          else if (c !== DELIMITER) continue;
          return text.slice(j, i);
        }

        // Return last token before EOF.
        return eof = true, text.slice(j, N);
      }

      while ((t = token()) !== EOF) {
        var row = [];
        while (t !== EOL && t !== EOF) row.push(t), t = token();
        if (f && (row = f(row, n++)) == null) continue;
        rows.push(row);
      }

      return rows;
    }

    function preformatBody(rows, columns) {
      return rows.map(function(row) {
        return columns.map(function(column) {
          return formatValue(row[column]);
        }).join(delimiter);
      });
    }

    function format(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return [columns.map(formatValue).join(delimiter)].concat(preformatBody(rows, columns)).join("\n");
    }

    function formatBody(rows, columns) {
      if (columns == null) columns = inferColumns(rows);
      return preformatBody(rows, columns).join("\n");
    }

    function formatRows(rows) {
      return rows.map(formatRow).join("\n");
    }

    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }

    function formatValue(value) {
      return value == null ? ""
          : value instanceof Date ? formatDate(value)
          : reFormat.test(value += "") ? "\"" + value.replace(/"/g, "\"\"") + "\""
          : value;
    }

    return {
      parse: parse,
      parseRows: parseRows,
      format: format,
      formatBody: formatBody,
      formatRows: formatRows,
      formatRow: formatRow,
      formatValue: formatValue
    };
  }

  var csv = dsvFormat(",");

  var tsv = dsvFormat("\t");

  // https://github.com/d3/d3-dsv/issues/45
  var fixtz = new Date("2019-01-01T00:00").getHours() || new Date("2019-07-01T00:00").getHours();

  function tree_add(d) {
    var x = +this._x.call(null, d),
        y = +this._y.call(null, d);
    return add(this.cover(x, y), x, y, d);
  }

  function add(tree, x, y, d) {
    if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

    var parent,
        node = tree._root,
        leaf = {data: d},
        x0 = tree._x0,
        y0 = tree._y0,
        x1 = tree._x1,
        y1 = tree._y1,
        xm,
        ym,
        xp,
        yp,
        right,
        bottom,
        i,
        j;

    // If the tree is empty, initialize the root as a leaf.
    if (!node) return tree._root = leaf, tree;

    // Find the existing leaf for the new point, or add it.
    while (node.length) {
      if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
      if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
      if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
    }

    // Is the new point is exactly coincident with the existing point?
    xp = +tree._x.call(null, node.data);
    yp = +tree._y.call(null, node.data);
    if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

    // Otherwise, split the leaf node until the old and new point are separated.
    do {
      parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
      if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
      if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
    return parent[j] = node, parent[i] = leaf, tree;
  }

  function addAll(data) {
    var d, i, n = data.length,
        x,
        y,
        xz = new Array(n),
        yz = new Array(n),
        x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;

    // Compute the points and their extent.
    for (i = 0; i < n; ++i) {
      if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
      xz[i] = x;
      yz[i] = y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }

    // If there were no (valid) points, abort.
    if (x0 > x1 || y0 > y1) return this;

    // Expand the tree to cover the new points.
    this.cover(x0, y0).cover(x1, y1);

    // Add the new points.
    for (i = 0; i < n; ++i) {
      add(this, xz[i], yz[i], data[i]);
    }

    return this;
  }

  function tree_cover(x, y) {
    if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

    var x0 = this._x0,
        y0 = this._y0,
        x1 = this._x1,
        y1 = this._y1;

    // If the quadtree has no extent, initialize them.
    // Integer extent are necessary so that if we later double the extent,
    // the existing quadrant boundaries don’t change due to floating point error!
    if (isNaN(x0)) {
      x1 = (x0 = Math.floor(x)) + 1;
      y1 = (y0 = Math.floor(y)) + 1;
    }

    // Otherwise, double repeatedly to cover.
    else {
      var z = x1 - x0,
          node = this._root,
          parent,
          i;

      while (x0 > x || x >= x1 || y0 > y || y >= y1) {
        i = (y < y0) << 1 | (x < x0);
        parent = new Array(4), parent[i] = node, node = parent, z *= 2;
        switch (i) {
          case 0: x1 = x0 + z, y1 = y0 + z; break;
          case 1: x0 = x1 - z, y1 = y0 + z; break;
          case 2: x1 = x0 + z, y0 = y1 - z; break;
          case 3: x0 = x1 - z, y0 = y1 - z; break;
        }
      }

      if (this._root && this._root.length) this._root = node;
    }

    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x1;
    this._y1 = y1;
    return this;
  }

  function tree_data() {
    var data = [];
    this.visit(function(node) {
      if (!node.length) do data.push(node.data); while (node = node.next)
    });
    return data;
  }

  function tree_extent(_) {
    return arguments.length
        ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
        : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
  }

  function Quad(node, x0, y0, x1, y1) {
    this.node = node;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
  }

  function tree_find(x, y, radius) {
    var data,
        x0 = this._x0,
        y0 = this._y0,
        x1,
        y1,
        x2,
        y2,
        x3 = this._x1,
        y3 = this._y1,
        quads = [],
        node = this._root,
        q,
        i;

    if (node) quads.push(new Quad(node, x0, y0, x3, y3));
    if (radius == null) radius = Infinity;
    else {
      x0 = x - radius, y0 = y - radius;
      x3 = x + radius, y3 = y + radius;
      radius *= radius;
    }

    while (q = quads.pop()) {

      // Stop searching if this quadrant can’t contain a closer node.
      if (!(node = q.node)
          || (x1 = q.x0) > x3
          || (y1 = q.y0) > y3
          || (x2 = q.x1) < x0
          || (y2 = q.y1) < y0) continue;

      // Bisect the current quadrant.
      if (node.length) {
        var xm = (x1 + x2) / 2,
            ym = (y1 + y2) / 2;

        quads.push(
          new Quad(node[3], xm, ym, x2, y2),
          new Quad(node[2], x1, ym, xm, y2),
          new Quad(node[1], xm, y1, x2, ym),
          new Quad(node[0], x1, y1, xm, ym)
        );

        // Visit the closest quadrant first.
        if (i = (y >= ym) << 1 | (x >= xm)) {
          q = quads[quads.length - 1];
          quads[quads.length - 1] = quads[quads.length - 1 - i];
          quads[quads.length - 1 - i] = q;
        }
      }

      // Visit this point. (Visiting coincident points isn’t necessary!)
      else {
        var dx = x - +this._x.call(null, node.data),
            dy = y - +this._y.call(null, node.data),
            d2 = dx * dx + dy * dy;
        if (d2 < radius) {
          var d = Math.sqrt(radius = d2);
          x0 = x - d, y0 = y - d;
          x3 = x + d, y3 = y + d;
          data = node.data;
        }
      }
    }

    return data;
  }

  function tree_remove(d) {
    if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

    var parent,
        node = this._root,
        retainer,
        previous,
        next,
        x0 = this._x0,
        y0 = this._y0,
        x1 = this._x1,
        y1 = this._y1,
        x,
        y,
        xm,
        ym,
        right,
        bottom,
        i,
        j;

    // If the tree is empty, initialize the root as a leaf.
    if (!node) return this;

    // Find the leaf node for the point.
    // While descending, also retain the deepest parent with a non-removed sibling.
    if (node.length) while (true) {
      if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
      if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
      if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
      if (!node.length) break;
      if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
    }

    // Find the point to remove.
    while (node.data !== d) if (!(previous = node, node = node.next)) return this;
    if (next = node.next) delete node.next;

    // If there are multiple coincident points, remove just the point.
    if (previous) return (next ? previous.next = next : delete previous.next), this;

    // If this is the root point, remove it.
    if (!parent) return this._root = next, this;

    // Remove this leaf.
    next ? parent[i] = next : delete parent[i];

    // If the parent now contains exactly one leaf, collapse superfluous parents.
    if ((node = parent[0] || parent[1] || parent[2] || parent[3])
        && node === (parent[3] || parent[2] || parent[1] || parent[0])
        && !node.length) {
      if (retainer) retainer[j] = node;
      else this._root = node;
    }

    return this;
  }

  function removeAll(data) {
    for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
    return this;
  }

  function tree_root() {
    return this._root;
  }

  function tree_size() {
    var size = 0;
    this.visit(function(node) {
      if (!node.length) do ++size; while (node = node.next)
    });
    return size;
  }

  function tree_visit(callback) {
    var quads = [], q, node = this._root, child, x0, y0, x1, y1;
    if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
    while (q = quads.pop()) {
      if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
        var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
        if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
        if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
        if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
        if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
      }
    }
    return this;
  }

  function tree_visitAfter(callback) {
    var quads = [], next = [], q;
    if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
    while (q = quads.pop()) {
      var node = q.node;
      if (node.length) {
        var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
        if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
        if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
        if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
        if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
      }
      next.push(q);
    }
    while (q = next.pop()) {
      callback(q.node, q.x0, q.y0, q.x1, q.y1);
    }
    return this;
  }

  function defaultX(d) {
    return d[0];
  }

  function tree_x(_) {
    return arguments.length ? (this._x = _, this) : this._x;
  }

  function defaultY(d) {
    return d[1];
  }

  function tree_y(_) {
    return arguments.length ? (this._y = _, this) : this._y;
  }

  function quadtree(nodes, x, y) {
    var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
    return nodes == null ? tree : tree.addAll(nodes);
  }

  function Quadtree(x, y, x0, y0, x1, y1) {
    this._x = x;
    this._y = y;
    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x1;
    this._y1 = y1;
    this._root = undefined;
  }

  function leaf_copy(leaf) {
    var copy = {data: leaf.data}, next = copy;
    while (leaf = leaf.next) next = next.next = {data: leaf.data};
    return copy;
  }

  var treeProto = quadtree.prototype = Quadtree.prototype;

  treeProto.copy = function() {
    var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
        node = this._root,
        nodes,
        child;

    if (!node) return copy;

    if (!node.length) return copy._root = leaf_copy(node), copy;

    nodes = [{source: node, target: copy._root = new Array(4)}];
    while (node = nodes.pop()) {
      for (var i = 0; i < 4; ++i) {
        if (child = node.source[i]) {
          if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
          else node.target[i] = leaf_copy(child);
        }
      }
    }

    return copy;
  };

  treeProto.add = tree_add;
  treeProto.addAll = addAll;
  treeProto.cover = tree_cover;
  treeProto.data = tree_data;
  treeProto.extent = tree_extent;
  treeProto.find = tree_find;
  treeProto.remove = tree_remove;
  treeProto.removeAll = removeAll;
  treeProto.root = tree_root;
  treeProto.size = tree_size;
  treeProto.visit = tree_visit;
  treeProto.visitAfter = tree_visitAfter;
  treeProto.x = tree_x;
  treeProto.y = tree_y;

  // Computes the decimal coefficient and exponent of the specified number x with
  // significant digits p, where x is positive and p is in [1, 21] or undefined.
  // For example, formatDecimal(1.23) returns ["123", 0].
  function formatDecimal(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
    return function(value, width) {
      var i = value.length,
          t = [],
          j = 0,
          g = grouping[0],
          length = 0;

      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }

      return t.reverse().join(thousands);
    };
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }

  formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
    this.align = specifier.align === undefined ? ">" : specifier.align + "";
    this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === undefined ? undefined : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === undefined ? "" : specifier.type + "";
  }

  FormatSpecifier.prototype.toString = function() {
    return this.fill
        + this.align
        + this.sign
        + this.symbol
        + (this.zero ? "0" : "")
        + (this.width === undefined ? "" : Math.max(1, this.width | 0))
        + (this.comma ? "," : "")
        + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
        + (this.trim ? "~" : "")
        + this.type;
  };

  // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
  function formatTrim(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".": i0 = i1 = i; break;
        case "0": if (i0 === 0) i0 = i; i1 = i; break;
        default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1],
        i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
        n = coefficient.length;
    return i === n ? coefficient
        : i > n ? coefficient + new Array(i - n + 1).join("0")
        : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
        : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
  }

  function formatRounded(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  var formatTypes = {
    "%": function(x, p) { return (x * 100).toFixed(p); },
    "b": function(x) { return Math.round(x).toString(2); },
    "c": function(x) { return x + ""; },
    "d": function(x) { return Math.round(x).toString(10); },
    "e": function(x, p) { return x.toExponential(p); },
    "f": function(x, p) { return x.toFixed(p); },
    "g": function(x, p) { return x.toPrecision(p); },
    "o": function(x) { return Math.round(x).toString(8); },
    "p": function(x, p) { return formatRounded(x * 100, p); },
    "r": formatRounded,
    "s": formatPrefixAuto,
    "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
    "x": function(x) { return Math.round(x).toString(16); }
  };

  function identity$2(x) {
    return x;
  }

  var map$1 = Array.prototype.map,
      prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping === undefined || locale.thousands === undefined ? identity$2 : formatGroup(map$1.call(locale.grouping, Number), locale.thousands + ""),
        currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
        currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
        decimal = locale.decimal === undefined ? "." : locale.decimal + "",
        numerals = locale.numerals === undefined ? identity$2 : formatNumerals(map$1.call(locale.numerals, String)),
        percent = locale.percent === undefined ? "%" : locale.percent + "",
        minus = locale.minus === undefined ? "-" : locale.minus + "",
        nan = locale.nan === undefined ? "NaN" : locale.nan + "";

    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);

      var fill = specifier.fill,
          align = specifier.align,
          sign = specifier.sign,
          symbol = specifier.symbol,
          zero = specifier.zero,
          width = specifier.width,
          comma = specifier.comma,
          precision = specifier.precision,
          trim = specifier.trim,
          type = specifier.type;

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // The "" type, and any invalid type, is an alias for ".12~g".
      else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      // Compute the prefix and suffix.
      // For SI-prefix, the suffix is lazily computed.
      var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
          suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

      // What format function should we use?
      // Is this an integer type?
      // Can this type generate exponential notation?
      var formatType = formatTypes[type],
          maybeSuffix = /[defgprs%]/.test(type);

      // Set the default precision if not specified,
      // or clamp the specified precision to the supported range.
      // For significant precision, it must be in [1, 21].
      // For fixed precision, it must be in [0, 20].
      precision = precision === undefined ? 6
          : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
          : Math.max(0, Math.min(20, precision));

      function format(value) {
        var valuePrefix = prefix,
            valueSuffix = suffix,
            i, n, c;

        if (type === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;

          // Determine the sign. -0 is not less than 0, but 1 / -0 is!
          var valueNegative = value < 0 || 1 / value < 0;

          // Perform the initial formatting.
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

          // Trim insignificant zeros.
          if (trim) value = formatTrim(value);

          // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
          if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

          // Compute the prefix and suffix.
          valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
          valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

          // Break the formatted value into the integer “value” part that can be
          // grouped, and fractional or exponential “suffix” part that is not.
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }

        // If the fill character is not "0", grouping is applied before padding.
        if (comma && !zero) value = group(value, Infinity);

        // Compute the padding.
        var length = valuePrefix.length + value.length + valueSuffix.length,
            padding = length < width ? new Array(width - length + 1).join(fill) : "";

        // If the fill character is "0", grouping is applied after padding.
        if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

        // Reconstruct the final output based on the desired alignment.
        switch (align) {
          case "<": value = valuePrefix + value + valueSuffix + padding; break;
          case "=": value = valuePrefix + padding + value + valueSuffix; break;
          case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
          default: value = padding + valuePrefix + value + valueSuffix; break;
        }

        return numerals(value);
      }

      format.toString = function() {
        return specifier + "";
      };

      return format;
    }

    function formatPrefix(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
          e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
          k = Math.pow(10, -e),
          prefix = prefixes[8 + e / 3];
      return function(value) {
        return f(k * value) + prefix;
      };
    }

    return {
      format: newFormat,
      formatPrefix: formatPrefix
    };
  }

  var locale;
  var format;
  var formatPrefix;

  defaultLocale({
    decimal: ".",
    thousands: ",",
    grouping: [3],
    currency: ["$", ""],
    minus: "-"
  });

  function defaultLocale(definition) {
    locale = formatLocale(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  // Adds floating point numbers with twice the normal precision.
  // Reference: J. R. Shewchuk, Adaptive Precision Floating-Point Arithmetic and
  // Fast Robust Geometric Predicates, Discrete & Computational Geometry 18(3)
  // 305–363 (1997).
  // Code adapted from GeographicLib by Charles F. F. Karney,
  // http://geographiclib.sourceforge.net/

  function adder() {
    return new Adder;
  }

  function Adder() {
    this.reset();
  }

  Adder.prototype = {
    constructor: Adder,
    reset: function() {
      this.s = // rounded value
      this.t = 0; // exact error
    },
    add: function(y) {
      add$1(temp, y, this.t);
      add$1(this, temp.s, this.s);
      if (this.s) this.t += temp.t;
      else this.s = temp.t;
    },
    valueOf: function() {
      return this.s;
    }
  };

  var temp = new Adder;

  function add$1(adder, a, b) {
    var x = adder.s = a + b,
        bv = x - a,
        av = x - bv;
    adder.t = (a - av) + (b - bv);
  }

  var areaRingSum = adder();

  var areaSum = adder();

  var deltaSum = adder();

  var sum = adder();

  var lengthSum = adder();

  var areaSum$1 = adder(),
      areaRingSum$1 = adder();

  var lengthSum$1 = adder();

  var t0$1 = new Date,
      t1$1 = new Date;

  function newInterval(floori, offseti, count, field) {

    function interval(date) {
      return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
    }

    interval.floor = function(date) {
      return floori(date = new Date(+date)), date;
    };

    interval.ceil = function(date) {
      return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
    };

    interval.round = function(date) {
      var d0 = interval(date),
          d1 = interval.ceil(date);
      return date - d0 < d1 - date ? d0 : d1;
    };

    interval.offset = function(date, step) {
      return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
    };

    interval.range = function(start, stop, step) {
      var range = [], previous;
      start = interval.ceil(start);
      step = step == null ? 1 : Math.floor(step);
      if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
      do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
      while (previous < start && start < stop);
      return range;
    };

    interval.filter = function(test) {
      return newInterval(function(date) {
        if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
      }, function(date, step) {
        if (date >= date) {
          if (step < 0) while (++step <= 0) {
            while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
          } else while (--step >= 0) {
            while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
          }
        }
      });
    };

    if (count) {
      interval.count = function(start, end) {
        t0$1.setTime(+start), t1$1.setTime(+end);
        floori(t0$1), floori(t1$1);
        return Math.floor(count(t0$1, t1$1));
      };

      interval.every = function(step) {
        step = Math.floor(step);
        return !isFinite(step) || !(step > 0) ? null
            : !(step > 1) ? interval
            : interval.filter(field
                ? function(d) { return field(d) % step === 0; }
                : function(d) { return interval.count(0, d) % step === 0; });
      };
    }

    return interval;
  }

  var millisecond = newInterval(function() {
    // noop
  }, function(date, step) {
    date.setTime(+date + step);
  }, function(start, end) {
    return end - start;
  });

  // An optimized implementation for this simple case.
  millisecond.every = function(k) {
    k = Math.floor(k);
    if (!isFinite(k) || !(k > 0)) return null;
    if (!(k > 1)) return millisecond;
    return newInterval(function(date) {
      date.setTime(Math.floor(date / k) * k);
    }, function(date, step) {
      date.setTime(+date + step * k);
    }, function(start, end) {
      return (end - start) / k;
    });
  };

  var durationSecond = 1e3;
  var durationMinute = 6e4;
  var durationHour = 36e5;
  var durationDay = 864e5;
  var durationWeek = 6048e5;

  var second = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds());
  }, function(date, step) {
    date.setTime(+date + step * durationSecond);
  }, function(start, end) {
    return (end - start) / durationSecond;
  }, function(date) {
    return date.getUTCSeconds();
  });

  var minute = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond);
  }, function(date, step) {
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getMinutes();
  });

  var hour = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond - date.getMinutes() * durationMinute);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getHours();
  });

  var day = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
  }, function(date) {
    return date.getDate() - 1;
  });

  function weekday(i) {
    return newInterval(function(date) {
      date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setDate(date.getDate() + step * 7);
    }, function(start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
    });
  }

  var sunday = weekday(0);
  var monday = weekday(1);
  var tuesday = weekday(2);
  var wednesday = weekday(3);
  var thursday = weekday(4);
  var friday = weekday(5);
  var saturday = weekday(6);

  var month = newInterval(function(date) {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setMonth(date.getMonth() + step);
  }, function(start, end) {
    return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
  }, function(date) {
    return date.getMonth();
  });

  var year = newInterval(function(date) {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step);
  }, function(start, end) {
    return end.getFullYear() - start.getFullYear();
  }, function(date) {
    return date.getFullYear();
  });

  // An optimized implementation for this simple case.
  year.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setFullYear(Math.floor(date.getFullYear() / k) * k);
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setFullYear(date.getFullYear() + step * k);
    });
  };

  var utcMinute = newInterval(function(date) {
    date.setUTCSeconds(0, 0);
  }, function(date, step) {
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getUTCMinutes();
  });

  var utcHour = newInterval(function(date) {
    date.setUTCMinutes(0, 0, 0);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getUTCHours();
  });

  var utcDay = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step);
  }, function(start, end) {
    return (end - start) / durationDay;
  }, function(date) {
    return date.getUTCDate() - 1;
  });

  function utcWeekday(i) {
    return newInterval(function(date) {
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCDate(date.getUTCDate() + step * 7);
    }, function(start, end) {
      return (end - start) / durationWeek;
    });
  }

  var utcSunday = utcWeekday(0);
  var utcMonday = utcWeekday(1);
  var utcTuesday = utcWeekday(2);
  var utcWednesday = utcWeekday(3);
  var utcThursday = utcWeekday(4);
  var utcFriday = utcWeekday(5);
  var utcSaturday = utcWeekday(6);

  var utcMonth = newInterval(function(date) {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCMonth(date.getUTCMonth() + step);
  }, function(start, end) {
    return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
  }, function(date) {
    return date.getUTCMonth();
  });

  var utcYear = newInterval(function(date) {
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step);
  }, function(start, end) {
    return end.getUTCFullYear() - start.getUTCFullYear();
  }, function(date) {
    return date.getUTCFullYear();
  });

  // An optimized implementation for this simple case.
  utcYear.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step * k);
    });
  };

  function localDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
      date.setFullYear(d.y);
      return date;
    }
    return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
  }

  function utcDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
      date.setUTCFullYear(d.y);
      return date;
    }
    return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
  }

  function newDate(y, m, d) {
    return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
  }

  function formatLocale$1(locale) {
    var locale_dateTime = locale.dateTime,
        locale_date = locale.date,
        locale_time = locale.time,
        locale_periods = locale.periods,
        locale_weekdays = locale.days,
        locale_shortWeekdays = locale.shortDays,
        locale_months = locale.months,
        locale_shortMonths = locale.shortMonths;

    var periodRe = formatRe(locale_periods),
        periodLookup = formatLookup(locale_periods),
        weekdayRe = formatRe(locale_weekdays),
        weekdayLookup = formatLookup(locale_weekdays),
        shortWeekdayRe = formatRe(locale_shortWeekdays),
        shortWeekdayLookup = formatLookup(locale_shortWeekdays),
        monthRe = formatRe(locale_months),
        monthLookup = formatLookup(locale_months),
        shortMonthRe = formatRe(locale_shortMonths),
        shortMonthLookup = formatLookup(locale_shortMonths);

    var formats = {
      "a": formatShortWeekday,
      "A": formatWeekday,
      "b": formatShortMonth,
      "B": formatMonth,
      "c": null,
      "d": formatDayOfMonth,
      "e": formatDayOfMonth,
      "f": formatMicroseconds,
      "H": formatHour24,
      "I": formatHour12,
      "j": formatDayOfYear,
      "L": formatMilliseconds,
      "m": formatMonthNumber,
      "M": formatMinutes,
      "p": formatPeriod,
      "q": formatQuarter,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatSeconds,
      "u": formatWeekdayNumberMonday,
      "U": formatWeekNumberSunday,
      "V": formatWeekNumberISO,
      "w": formatWeekdayNumberSunday,
      "W": formatWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatYear$1,
      "Y": formatFullYear,
      "Z": formatZone,
      "%": formatLiteralPercent
    };

    var utcFormats = {
      "a": formatUTCShortWeekday,
      "A": formatUTCWeekday,
      "b": formatUTCShortMonth,
      "B": formatUTCMonth,
      "c": null,
      "d": formatUTCDayOfMonth,
      "e": formatUTCDayOfMonth,
      "f": formatUTCMicroseconds,
      "H": formatUTCHour24,
      "I": formatUTCHour12,
      "j": formatUTCDayOfYear,
      "L": formatUTCMilliseconds,
      "m": formatUTCMonthNumber,
      "M": formatUTCMinutes,
      "p": formatUTCPeriod,
      "q": formatUTCQuarter,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatUTCSeconds,
      "u": formatUTCWeekdayNumberMonday,
      "U": formatUTCWeekNumberSunday,
      "V": formatUTCWeekNumberISO,
      "w": formatUTCWeekdayNumberSunday,
      "W": formatUTCWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatUTCYear,
      "Y": formatUTCFullYear,
      "Z": formatUTCZone,
      "%": formatLiteralPercent
    };

    var parses = {
      "a": parseShortWeekday,
      "A": parseWeekday,
      "b": parseShortMonth,
      "B": parseMonth,
      "c": parseLocaleDateTime,
      "d": parseDayOfMonth,
      "e": parseDayOfMonth,
      "f": parseMicroseconds,
      "H": parseHour24,
      "I": parseHour24,
      "j": parseDayOfYear,
      "L": parseMilliseconds,
      "m": parseMonthNumber,
      "M": parseMinutes,
      "p": parsePeriod,
      "q": parseQuarter,
      "Q": parseUnixTimestamp,
      "s": parseUnixTimestampSeconds,
      "S": parseSeconds,
      "u": parseWeekdayNumberMonday,
      "U": parseWeekNumberSunday,
      "V": parseWeekNumberISO,
      "w": parseWeekdayNumberSunday,
      "W": parseWeekNumberMonday,
      "x": parseLocaleDate,
      "X": parseLocaleTime,
      "y": parseYear,
      "Y": parseFullYear,
      "Z": parseZone,
      "%": parseLiteralPercent
    };

    // These recursive directive definitions must be deferred.
    formats.x = newFormat(locale_date, formats);
    formats.X = newFormat(locale_time, formats);
    formats.c = newFormat(locale_dateTime, formats);
    utcFormats.x = newFormat(locale_date, utcFormats);
    utcFormats.X = newFormat(locale_time, utcFormats);
    utcFormats.c = newFormat(locale_dateTime, utcFormats);

    function newFormat(specifier, formats) {
      return function(date) {
        var string = [],
            i = -1,
            j = 0,
            n = specifier.length,
            c,
            pad,
            format;

        if (!(date instanceof Date)) date = new Date(+date);

        while (++i < n) {
          if (specifier.charCodeAt(i) === 37) {
            string.push(specifier.slice(j, i));
            if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
            else pad = c === "e" ? " " : "0";
            if (format = formats[c]) c = format(date, pad);
            string.push(c);
            j = i + 1;
          }
        }

        string.push(specifier.slice(j, i));
        return string.join("");
      };
    }

    function newParse(specifier, Z) {
      return function(string) {
        var d = newDate(1900, undefined, 1),
            i = parseSpecifier(d, specifier, string += "", 0),
            week, day$1;
        if (i != string.length) return null;

        // If a UNIX timestamp is specified, return it.
        if ("Q" in d) return new Date(d.Q);
        if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

        // If this is utcParse, never use the local timezone.
        if (Z && !("Z" in d)) d.Z = 0;

        // The am-pm flag is 0 for AM, and 1 for PM.
        if ("p" in d) d.H = d.H % 12 + d.p * 12;

        // If the month was not specified, inherit from the quarter.
        if (d.m === undefined) d.m = "q" in d ? d.q : 0;

        // Convert day-of-week and week-of-year to day-of-year.
        if ("V" in d) {
          if (d.V < 1 || d.V > 53) return null;
          if (!("w" in d)) d.w = 1;
          if ("Z" in d) {
            week = utcDate(newDate(d.y, 0, 1)), day$1 = week.getUTCDay();
            week = day$1 > 4 || day$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
            week = utcDay.offset(week, (d.V - 1) * 7);
            d.y = week.getUTCFullYear();
            d.m = week.getUTCMonth();
            d.d = week.getUTCDate() + (d.w + 6) % 7;
          } else {
            week = localDate(newDate(d.y, 0, 1)), day$1 = week.getDay();
            week = day$1 > 4 || day$1 === 0 ? monday.ceil(week) : monday(week);
            week = day.offset(week, (d.V - 1) * 7);
            d.y = week.getFullYear();
            d.m = week.getMonth();
            d.d = week.getDate() + (d.w + 6) % 7;
          }
        } else if ("W" in d || "U" in d) {
          if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
          day$1 = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
          d.m = 0;
          d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$1 + 5) % 7 : d.w + d.U * 7 - (day$1 + 6) % 7;
        }

        // If a time zone is specified, all fields are interpreted as UTC and then
        // offset according to the specified time zone.
        if ("Z" in d) {
          d.H += d.Z / 100 | 0;
          d.M += d.Z % 100;
          return utcDate(d);
        }

        // Otherwise, all fields are in local time.
        return localDate(d);
      };
    }

    function parseSpecifier(d, specifier, string, j) {
      var i = 0,
          n = specifier.length,
          m = string.length,
          c,
          parse;

      while (i < n) {
        if (j >= m) return -1;
        c = specifier.charCodeAt(i++);
        if (c === 37) {
          c = specifier.charAt(i++);
          parse = parses[c in pads ? specifier.charAt(i++) : c];
          if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
        } else if (c != string.charCodeAt(j++)) {
          return -1;
        }
      }

      return j;
    }

    function parsePeriod(d, string, i) {
      var n = periodRe.exec(string.slice(i));
      return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortWeekday(d, string, i) {
      var n = shortWeekdayRe.exec(string.slice(i));
      return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseWeekday(d, string, i) {
      var n = weekdayRe.exec(string.slice(i));
      return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortMonth(d, string, i) {
      var n = shortMonthRe.exec(string.slice(i));
      return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseMonth(d, string, i) {
      var n = monthRe.exec(string.slice(i));
      return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseLocaleDateTime(d, string, i) {
      return parseSpecifier(d, locale_dateTime, string, i);
    }

    function parseLocaleDate(d, string, i) {
      return parseSpecifier(d, locale_date, string, i);
    }

    function parseLocaleTime(d, string, i) {
      return parseSpecifier(d, locale_time, string, i);
    }

    function formatShortWeekday(d) {
      return locale_shortWeekdays[d.getDay()];
    }

    function formatWeekday(d) {
      return locale_weekdays[d.getDay()];
    }

    function formatShortMonth(d) {
      return locale_shortMonths[d.getMonth()];
    }

    function formatMonth(d) {
      return locale_months[d.getMonth()];
    }

    function formatPeriod(d) {
      return locale_periods[+(d.getHours() >= 12)];
    }

    function formatQuarter(d) {
      return 1 + ~~(d.getMonth() / 3);
    }

    function formatUTCShortWeekday(d) {
      return locale_shortWeekdays[d.getUTCDay()];
    }

    function formatUTCWeekday(d) {
      return locale_weekdays[d.getUTCDay()];
    }

    function formatUTCShortMonth(d) {
      return locale_shortMonths[d.getUTCMonth()];
    }

    function formatUTCMonth(d) {
      return locale_months[d.getUTCMonth()];
    }

    function formatUTCPeriod(d) {
      return locale_periods[+(d.getUTCHours() >= 12)];
    }

    function formatUTCQuarter(d) {
      return 1 + ~~(d.getUTCMonth() / 3);
    }

    return {
      format: function(specifier) {
        var f = newFormat(specifier += "", formats);
        f.toString = function() { return specifier; };
        return f;
      },
      parse: function(specifier) {
        var p = newParse(specifier += "", false);
        p.toString = function() { return specifier; };
        return p;
      },
      utcFormat: function(specifier) {
        var f = newFormat(specifier += "", utcFormats);
        f.toString = function() { return specifier; };
        return f;
      },
      utcParse: function(specifier) {
        var p = newParse(specifier += "", true);
        p.toString = function() { return specifier; };
        return p;
      }
    };
  }

  var pads = {"-": "", "_": " ", "0": "0"},
      numberRe = /^\s*\d+/, // note: ignores next directive
      percentRe = /^%/,
      requoteRe = /[\\^$*+?|[\]().{}]/g;

  function pad$1(value, fill, width) {
    var sign = value < 0 ? "-" : "",
        string = (sign ? -value : value) + "",
        length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }

  function requote(s) {
    return s.replace(requoteRe, "\\$&");
  }

  function formatRe(names) {
    return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
  }

  function formatLookup(names) {
    var map = {}, i = -1, n = names.length;
    while (++i < n) map[names[i].toLowerCase()] = i;
    return map;
  }

  function parseWeekdayNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.w = +n[0], i + n[0].length) : -1;
  }

  function parseWeekdayNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.u = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.U = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberISO(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.V = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.W = +n[0], i + n[0].length) : -1;
  }

  function parseFullYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 4));
    return n ? (d.y = +n[0], i + n[0].length) : -1;
  }

  function parseYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
  }

  function parseZone(d, string, i) {
    var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
    return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
  }

  function parseQuarter(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
  }

  function parseMonthNumber(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
  }

  function parseDayOfMonth(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.d = +n[0], i + n[0].length) : -1;
  }

  function parseDayOfYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
  }

  function parseHour24(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.H = +n[0], i + n[0].length) : -1;
  }

  function parseMinutes(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.M = +n[0], i + n[0].length) : -1;
  }

  function parseSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.S = +n[0], i + n[0].length) : -1;
  }

  function parseMilliseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.L = +n[0], i + n[0].length) : -1;
  }

  function parseMicroseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 6));
    return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
  }

  function parseLiteralPercent(d, string, i) {
    var n = percentRe.exec(string.slice(i, i + 1));
    return n ? i + n[0].length : -1;
  }

  function parseUnixTimestamp(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.Q = +n[0], i + n[0].length) : -1;
  }

  function parseUnixTimestampSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.s = +n[0], i + n[0].length) : -1;
  }

  function formatDayOfMonth(d, p) {
    return pad$1(d.getDate(), p, 2);
  }

  function formatHour24(d, p) {
    return pad$1(d.getHours(), p, 2);
  }

  function formatHour12(d, p) {
    return pad$1(d.getHours() % 12 || 12, p, 2);
  }

  function formatDayOfYear(d, p) {
    return pad$1(1 + day.count(year(d), d), p, 3);
  }

  function formatMilliseconds(d, p) {
    return pad$1(d.getMilliseconds(), p, 3);
  }

  function formatMicroseconds(d, p) {
    return formatMilliseconds(d, p) + "000";
  }

  function formatMonthNumber(d, p) {
    return pad$1(d.getMonth() + 1, p, 2);
  }

  function formatMinutes(d, p) {
    return pad$1(d.getMinutes(), p, 2);
  }

  function formatSeconds(d, p) {
    return pad$1(d.getSeconds(), p, 2);
  }

  function formatWeekdayNumberMonday(d) {
    var day = d.getDay();
    return day === 0 ? 7 : day;
  }

  function formatWeekNumberSunday(d, p) {
    return pad$1(sunday.count(year(d) - 1, d), p, 2);
  }

  function formatWeekNumberISO(d, p) {
    var day = d.getDay();
    d = (day >= 4 || day === 0) ? thursday(d) : thursday.ceil(d);
    return pad$1(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
  }

  function formatWeekdayNumberSunday(d) {
    return d.getDay();
  }

  function formatWeekNumberMonday(d, p) {
    return pad$1(monday.count(year(d) - 1, d), p, 2);
  }

  function formatYear$1(d, p) {
    return pad$1(d.getFullYear() % 100, p, 2);
  }

  function formatFullYear(d, p) {
    return pad$1(d.getFullYear() % 10000, p, 4);
  }

  function formatZone(d) {
    var z = d.getTimezoneOffset();
    return (z > 0 ? "-" : (z *= -1, "+"))
        + pad$1(z / 60 | 0, "0", 2)
        + pad$1(z % 60, "0", 2);
  }

  function formatUTCDayOfMonth(d, p) {
    return pad$1(d.getUTCDate(), p, 2);
  }

  function formatUTCHour24(d, p) {
    return pad$1(d.getUTCHours(), p, 2);
  }

  function formatUTCHour12(d, p) {
    return pad$1(d.getUTCHours() % 12 || 12, p, 2);
  }

  function formatUTCDayOfYear(d, p) {
    return pad$1(1 + utcDay.count(utcYear(d), d), p, 3);
  }

  function formatUTCMilliseconds(d, p) {
    return pad$1(d.getUTCMilliseconds(), p, 3);
  }

  function formatUTCMicroseconds(d, p) {
    return formatUTCMilliseconds(d, p) + "000";
  }

  function formatUTCMonthNumber(d, p) {
    return pad$1(d.getUTCMonth() + 1, p, 2);
  }

  function formatUTCMinutes(d, p) {
    return pad$1(d.getUTCMinutes(), p, 2);
  }

  function formatUTCSeconds(d, p) {
    return pad$1(d.getUTCSeconds(), p, 2);
  }

  function formatUTCWeekdayNumberMonday(d) {
    var dow = d.getUTCDay();
    return dow === 0 ? 7 : dow;
  }

  function formatUTCWeekNumberSunday(d, p) {
    return pad$1(utcSunday.count(utcYear(d) - 1, d), p, 2);
  }

  function formatUTCWeekNumberISO(d, p) {
    var day = d.getUTCDay();
    d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
    return pad$1(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
  }

  function formatUTCWeekdayNumberSunday(d) {
    return d.getUTCDay();
  }

  function formatUTCWeekNumberMonday(d, p) {
    return pad$1(utcMonday.count(utcYear(d) - 1, d), p, 2);
  }

  function formatUTCYear(d, p) {
    return pad$1(d.getUTCFullYear() % 100, p, 2);
  }

  function formatUTCFullYear(d, p) {
    return pad$1(d.getUTCFullYear() % 10000, p, 4);
  }

  function formatUTCZone() {
    return "+0000";
  }

  function formatLiteralPercent() {
    return "%";
  }

  function formatUnixTimestamp(d) {
    return +d;
  }

  function formatUnixTimestampSeconds(d) {
    return Math.floor(+d / 1000);
  }

  var locale$1;
  var timeFormat;
  var timeParse;
  var utcFormat;
  var utcParse;

  defaultLocale$1({
    dateTime: "%x, %X",
    date: "%-m/%-d/%Y",
    time: "%-I:%M:%S %p",
    periods: ["AM", "PM"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  });

  function defaultLocale$1(definition) {
    locale$1 = formatLocale$1(definition);
    timeFormat = locale$1.format;
    timeParse = locale$1.parse;
    utcFormat = locale$1.utcFormat;
    utcParse = locale$1.utcParse;
    return locale$1;
  }

  var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

  function formatIsoNative(date) {
    return date.toISOString();
  }

  var formatIso = Date.prototype.toISOString
      ? formatIsoNative
      : utcFormat(isoSpecifier);

  function parseIsoNative(string) {
    var date = new Date(string);
    return isNaN(date) ? null : date;
  }

  var parseIso = +new Date("2000-01-01T00:00:00.000Z")
      ? parseIsoNative
      : utcParse(isoSpecifier);

  function colors(specifier) {
    var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
    while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
    return colors;
  }

  colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

  colors("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666");

  colors("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666");

  colors("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928");

  colors("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2");

  colors("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc");

  colors("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999");

  colors("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3");

  colors("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f");

  colors("4e79a7f28e2ce1575976b7b259a14fedc949af7aa1ff9da79c755fbab0ab");

  function ramp(scheme) {
    return rgbBasis(scheme[scheme.length - 1]);
  }

  var scheme = new Array(3).concat(
    "d8b365f5f5f55ab4ac",
    "a6611adfc27d80cdc1018571",
    "a6611adfc27df5f5f580cdc1018571",
    "8c510ad8b365f6e8c3c7eae55ab4ac01665e",
    "8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e",
    "8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e",
    "8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e",
    "5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30",
    "5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30"
  ).map(colors);

  ramp(scheme);

  var scheme$1 = new Array(3).concat(
    "af8dc3f7f7f77fbf7b",
    "7b3294c2a5cfa6dba0008837",
    "7b3294c2a5cff7f7f7a6dba0008837",
    "762a83af8dc3e7d4e8d9f0d37fbf7b1b7837",
    "762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837",
    "762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837",
    "762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837",
    "40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b",
    "40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b"
  ).map(colors);

  ramp(scheme$1);

  var scheme$2 = new Array(3).concat(
    "e9a3c9f7f7f7a1d76a",
    "d01c8bf1b6dab8e1864dac26",
    "d01c8bf1b6daf7f7f7b8e1864dac26",
    "c51b7de9a3c9fde0efe6f5d0a1d76a4d9221",
    "c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221",
    "c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221",
    "c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221",
    "8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419",
    "8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419"
  ).map(colors);

  ramp(scheme$2);

  var scheme$3 = new Array(3).concat(
    "998ec3f7f7f7f1a340",
    "5e3c99b2abd2fdb863e66101",
    "5e3c99b2abd2f7f7f7fdb863e66101",
    "542788998ec3d8daebfee0b6f1a340b35806",
    "542788998ec3d8daebf7f7f7fee0b6f1a340b35806",
    "5427888073acb2abd2d8daebfee0b6fdb863e08214b35806",
    "5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806",
    "2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08",
    "2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08"
  ).map(colors);

  ramp(scheme$3);

  var scheme$4 = new Array(3).concat(
    "ef8a62f7f7f767a9cf",
    "ca0020f4a58292c5de0571b0",
    "ca0020f4a582f7f7f792c5de0571b0",
    "b2182bef8a62fddbc7d1e5f067a9cf2166ac",
    "b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac",
    "b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac",
    "b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac",
    "67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061",
    "67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061"
  ).map(colors);

  ramp(scheme$4);

  var scheme$5 = new Array(3).concat(
    "ef8a62ffffff999999",
    "ca0020f4a582bababa404040",
    "ca0020f4a582ffffffbababa404040",
    "b2182bef8a62fddbc7e0e0e09999994d4d4d",
    "b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d",
    "b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d",
    "b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d",
    "67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a",
    "67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a"
  ).map(colors);

  ramp(scheme$5);

  var scheme$6 = new Array(3).concat(
    "fc8d59ffffbf91bfdb",
    "d7191cfdae61abd9e92c7bb6",
    "d7191cfdae61ffffbfabd9e92c7bb6",
    "d73027fc8d59fee090e0f3f891bfdb4575b4",
    "d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4",
    "d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4",
    "d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4",
    "a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695",
    "a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695"
  ).map(colors);

  ramp(scheme$6);

  var scheme$7 = new Array(3).concat(
    "fc8d59ffffbf91cf60",
    "d7191cfdae61a6d96a1a9641",
    "d7191cfdae61ffffbfa6d96a1a9641",
    "d73027fc8d59fee08bd9ef8b91cf601a9850",
    "d73027fc8d59fee08bffffbfd9ef8b91cf601a9850",
    "d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850",
    "d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850",
    "a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837",
    "a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837"
  ).map(colors);

  ramp(scheme$7);

  var scheme$8 = new Array(3).concat(
    "fc8d59ffffbf99d594",
    "d7191cfdae61abdda42b83ba",
    "d7191cfdae61ffffbfabdda42b83ba",
    "d53e4ffc8d59fee08be6f59899d5943288bd",
    "d53e4ffc8d59fee08bffffbfe6f59899d5943288bd",
    "d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd",
    "d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd",
    "9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2",
    "9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2"
  ).map(colors);

  ramp(scheme$8);

  var scheme$9 = new Array(3).concat(
    "e5f5f999d8c92ca25f",
    "edf8fbb2e2e266c2a4238b45",
    "edf8fbb2e2e266c2a42ca25f006d2c",
    "edf8fbccece699d8c966c2a42ca25f006d2c",
    "edf8fbccece699d8c966c2a441ae76238b45005824",
    "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824",
    "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b"
  ).map(colors);

  ramp(scheme$9);

  var scheme$a = new Array(3).concat(
    "e0ecf49ebcda8856a7",
    "edf8fbb3cde38c96c688419d",
    "edf8fbb3cde38c96c68856a7810f7c",
    "edf8fbbfd3e69ebcda8c96c68856a7810f7c",
    "edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b",
    "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b",
    "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b"
  ).map(colors);

  ramp(scheme$a);

  var scheme$b = new Array(3).concat(
    "e0f3dba8ddb543a2ca",
    "f0f9e8bae4bc7bccc42b8cbe",
    "f0f9e8bae4bc7bccc443a2ca0868ac",
    "f0f9e8ccebc5a8ddb57bccc443a2ca0868ac",
    "f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e",
    "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e",
    "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081"
  ).map(colors);

  ramp(scheme$b);

  var scheme$c = new Array(3).concat(
    "fee8c8fdbb84e34a33",
    "fef0d9fdcc8afc8d59d7301f",
    "fef0d9fdcc8afc8d59e34a33b30000",
    "fef0d9fdd49efdbb84fc8d59e34a33b30000",
    "fef0d9fdd49efdbb84fc8d59ef6548d7301f990000",
    "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000",
    "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000"
  ).map(colors);

  ramp(scheme$c);

  var scheme$d = new Array(3).concat(
    "ece2f0a6bddb1c9099",
    "f6eff7bdc9e167a9cf02818a",
    "f6eff7bdc9e167a9cf1c9099016c59",
    "f6eff7d0d1e6a6bddb67a9cf1c9099016c59",
    "f6eff7d0d1e6a6bddb67a9cf3690c002818a016450",
    "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450",
    "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636"
  ).map(colors);

  ramp(scheme$d);

  var scheme$e = new Array(3).concat(
    "ece7f2a6bddb2b8cbe",
    "f1eef6bdc9e174a9cf0570b0",
    "f1eef6bdc9e174a9cf2b8cbe045a8d",
    "f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d",
    "f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b",
    "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b",
    "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858"
  ).map(colors);

  ramp(scheme$e);

  var scheme$f = new Array(3).concat(
    "e7e1efc994c7dd1c77",
    "f1eef6d7b5d8df65b0ce1256",
    "f1eef6d7b5d8df65b0dd1c77980043",
    "f1eef6d4b9dac994c7df65b0dd1c77980043",
    "f1eef6d4b9dac994c7df65b0e7298ace125691003f",
    "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f",
    "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f"
  ).map(colors);

  ramp(scheme$f);

  var scheme$g = new Array(3).concat(
    "fde0ddfa9fb5c51b8a",
    "feebe2fbb4b9f768a1ae017e",
    "feebe2fbb4b9f768a1c51b8a7a0177",
    "feebe2fcc5c0fa9fb5f768a1c51b8a7a0177",
    "feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177",
    "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177",
    "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a"
  ).map(colors);

  ramp(scheme$g);

  var scheme$h = new Array(3).concat(
    "edf8b17fcdbb2c7fb8",
    "ffffcca1dab441b6c4225ea8",
    "ffffcca1dab441b6c42c7fb8253494",
    "ffffccc7e9b47fcdbb41b6c42c7fb8253494",
    "ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84",
    "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84",
    "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58"
  ).map(colors);

  ramp(scheme$h);

  var scheme$i = new Array(3).concat(
    "f7fcb9addd8e31a354",
    "ffffccc2e69978c679238443",
    "ffffccc2e69978c67931a354006837",
    "ffffccd9f0a3addd8e78c67931a354006837",
    "ffffccd9f0a3addd8e78c67941ab5d238443005a32",
    "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32",
    "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529"
  ).map(colors);

  ramp(scheme$i);

  var scheme$j = new Array(3).concat(
    "fff7bcfec44fd95f0e",
    "ffffd4fed98efe9929cc4c02",
    "ffffd4fed98efe9929d95f0e993404",
    "ffffd4fee391fec44ffe9929d95f0e993404",
    "ffffd4fee391fec44ffe9929ec7014cc4c028c2d04",
    "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04",
    "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506"
  ).map(colors);

  ramp(scheme$j);

  var scheme$k = new Array(3).concat(
    "ffeda0feb24cf03b20",
    "ffffb2fecc5cfd8d3ce31a1c",
    "ffffb2fecc5cfd8d3cf03b20bd0026",
    "ffffb2fed976feb24cfd8d3cf03b20bd0026",
    "ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026",
    "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026",
    "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026"
  ).map(colors);

  ramp(scheme$k);

  var scheme$l = new Array(3).concat(
    "deebf79ecae13182bd",
    "eff3ffbdd7e76baed62171b5",
    "eff3ffbdd7e76baed63182bd08519c",
    "eff3ffc6dbef9ecae16baed63182bd08519c",
    "eff3ffc6dbef9ecae16baed64292c62171b5084594",
    "f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594",
    "f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b"
  ).map(colors);

  ramp(scheme$l);

  var scheme$m = new Array(3).concat(
    "e5f5e0a1d99b31a354",
    "edf8e9bae4b374c476238b45",
    "edf8e9bae4b374c47631a354006d2c",
    "edf8e9c7e9c0a1d99b74c47631a354006d2c",
    "edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32",
    "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32",
    "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b"
  ).map(colors);

  ramp(scheme$m);

  var scheme$n = new Array(3).concat(
    "f0f0f0bdbdbd636363",
    "f7f7f7cccccc969696525252",
    "f7f7f7cccccc969696636363252525",
    "f7f7f7d9d9d9bdbdbd969696636363252525",
    "f7f7f7d9d9d9bdbdbd969696737373525252252525",
    "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525",
    "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000"
  ).map(colors);

  ramp(scheme$n);

  var scheme$o = new Array(3).concat(
    "efedf5bcbddc756bb1",
    "f2f0f7cbc9e29e9ac86a51a3",
    "f2f0f7cbc9e29e9ac8756bb154278f",
    "f2f0f7dadaebbcbddc9e9ac8756bb154278f",
    "f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486",
    "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486",
    "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d"
  ).map(colors);

  ramp(scheme$o);

  var scheme$p = new Array(3).concat(
    "fee0d2fc9272de2d26",
    "fee5d9fcae91fb6a4acb181d",
    "fee5d9fcae91fb6a4ade2d26a50f15",
    "fee5d9fcbba1fc9272fb6a4ade2d26a50f15",
    "fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d",
    "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d",
    "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d"
  ).map(colors);

  ramp(scheme$p);

  var scheme$q = new Array(3).concat(
    "fee6cefdae6be6550d",
    "feeddefdbe85fd8d3cd94701",
    "feeddefdbe85fd8d3ce6550da63603",
    "feeddefdd0a2fdae6bfd8d3ce6550da63603",
    "feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04",
    "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04",
    "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704"
  ).map(colors);

  ramp(scheme$q);

  cubehelixLong(cubehelix(300, 0.5, 0.0), cubehelix(-240, 0.5, 1.0));

  var warm = cubehelixLong(cubehelix(-100, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

  var cool = cubehelixLong(cubehelix(260, 0.75, 0.35), cubehelix(80, 1.50, 0.8));

  var c = cubehelix();

  var c$1 = rgb();

  function ramp$1(range) {
    var n = range.length;
    return function(t) {
      return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
    };
  }

  ramp$1(colors("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));

  var magma = ramp$1(colors("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));

  var inferno = ramp$1(colors("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));

  var plasma = ramp$1(colors("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));

  function sign$1(x) {
    return x < 0 ? -1 : 1;
  }

  // Calculate the slopes of the tangents (Hermite-type interpolation) based on
  // the following paper: Steffen, M. 1990. A Simple Method for Monotonic
  // Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
  // NOV(II), P. 443, 1990.
  function slope3(that, x2, y2) {
    var h0 = that._x1 - that._x0,
        h1 = x2 - that._x1,
        s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
        s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
        p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign$1(s0) + sign$1(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }

  // Calculate a one-sided slope.
  function slope2(that, t) {
    var h = that._x1 - that._x0;
    return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
  }

  // According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
  // "you can express cubic Hermite interpolation in terms of cubic Bézier curves
  // with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
  function point(that, t0, t1) {
    var x0 = that._x0,
        y0 = that._y0,
        x1 = that._x1,
        y1 = that._y1,
        dx = (x1 - x0) / 3;
    that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
  }

  function MonotoneX(context) {
    this._context = context;
  }

  MonotoneX.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 =
      this._y0 = this._y1 =
      this._t0 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 2: this._context.lineTo(this._x1, this._y1); break;
        case 3: point(this, this._t0, slope2(this, this._t0)); break;
      }
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      var t1 = NaN;

      x = +x, y = +y;
      if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; point(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
        default: point(this, this._t0, t1 = slope3(this, x, y)); break;
      }

      this._x0 = this._x1, this._x1 = x;
      this._y0 = this._y1, this._y1 = y;
      this._t0 = t1;
    }
  };

  function MonotoneY(context) {
    this._context = new ReflectContext(context);
  }

  (MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
    MonotoneX.prototype.point.call(this, y, x);
  };

  function ReflectContext(context) {
    this._context = context;
  }

  ReflectContext.prototype = {
    moveTo: function(x, y) { this._context.moveTo(y, x); },
    closePath: function() { this._context.closePath(); },
    lineTo: function(x, y) { this._context.lineTo(y, x); },
    bezierCurveTo: function(x1, y1, x2, y2, x, y) { this._context.bezierCurveTo(y1, x1, y2, x2, y, x); }
  };

  //import { voronoi } from 'd3';

  // let display = true;
  let play = false;

  window.addEventListener('load', () => {

    let playButton = document.getElementById('playbutton');
    playButton.addEventListener('click', function () {
      if (!play) {
        playButton.setAttribute('class', 'hidden');
        play = true;
        start$1();
      }
    });

  });

  async function start$1() {
    try {
      const con = new Console(192, 256);

      const textBitmap = new Uint8Array(
        await fetch('./font.bin')
          .then(r => r.arrayBuffer()));

      const memory = new ArrayBuffer(con.MEMORY_SIZE_NEEDED + Vox.prototype.MEMORY_SIZE_NEEDED);

      let offset = 0;
      con.initConsole({ textBitmap: textBitmap, memory: memory, offset: offset });
      offset += con.MEMORY_SIZE_NEEDED;
      const gl = con.gl;
      const gl2 = con.gl2;

      //const voxmodel = new Vox({gl2:gl2,data:await loadVox('myship.bin')});
      const voxelModels = await VoxelModel.loadFromUrls([
        'cube.bin',
        'myship.bin',
        'q.bin',
        'q1.bin',
        'chr.bin'
      ]);

      const vox = new Vox({ gl2: gl2, voxelModels: voxelModels, memory: memory, offset: offset });
      let count = 1;

      for (let y = 8, offset = 0; y < con.VIRTUAL_HEIGHT; y += 16) {
        for (let x = 8; x < con.VIRTUAL_WIDTH; x += 16) {
          const vmem = vox.voxScreenMemory;
          vmem.setUint32(offset + vox.VOX_OBJ_ATTRIB, 0x8003fc00 | count++ | (0), vox.endian);
          vmem.setFloat32(offset + vox.VOX_OBJ_SCALE, 0.7, vox.endian);
          vmem.setFloat32(offset + vox.VOX_OBJ_POS, x - con.VIRTUAL_WIDTH / 2, vox.endian);
          vmem.setFloat32(offset + vox.VOX_OBJ_POS + vox.SIZE_PARAM, y - con.VIRTUAL_HEIGHT / 2, vox.endian);
          vmem.setFloat32(offset + vox.VOX_OBJ_POS + vox.SIZE_PARAM * 2, 0, vox.endian);
          vmem.setFloat32(offset + vox.VOX_OBJ_ANGLE, count, vox.endian);
          offset += vox.VOX_MEMORY_STRIDE;
        }
      }

      //const myship = new SceneNode(model);

      const map = new Map$1({ gl2: gl2, mapModels: await MapModel.load() });
      con.vscreen.appendScene(map);
      const pathWay = (await (await fetch('./scrollMap.json')).json()).features[0].geometry.coordinates.map(d => fromValues$2(d[0], d[1]));
      const pathVector = [];

      pathWay.reduce((prev, curr, i) => {
        const pathVec = {};
        pathVec.start = prev;
        pathVec.end = curr;
        //console.log(prev,curr,i);
        pathVec.dist = sub(create$5(), curr, prev);
        pathVec.distance = Math.sqrt(pathVec.dist[0] ** 2 + pathVec.dist[1] ** 2);
        pathVec.speed = 0.00001;
        pathVec.dir = normalize$3(create$5(), pathVec.dist);
        pathVec.angle = Math.atan2(pathVec.dir[1], pathVec.dir[0]);
        pathVec.dir[0] *= pathVec.speed;
        pathVec.dir[1] *= pathVec.speed;
        pathVec.count = pathVec.distance / pathVec.speed;
        

        if (prev.prevAngle) {
          const angleSpeed = 0.05;
          pathVec.prevAngle = prev.prevAngle;
          let a = prev.prevAngle - pathVec.angle;
          if (a) {
            if (a < 0) a += Math.PI * 2;
            if (a >= Math.PI * 2) a -= Math.PI * 2;
            if (a < Math.PI) {
              pathVec.angleDir = -angleSpeed;
            } else {
              pathVec.angleDir = angleSpeed;
              a = 2 * Math.PI - a;
            }
            pathVec.angleCount = (a / angleSpeed) | 0;
            if (pathVec.angleCount > pathVec.count) {
              pathVec.angleCount = pathVec.count;
              
              if (pathVec.angleDir >= 0) {
                pathVec.angleDir = (a / pathVec.count);
              } else {
                pathVec.angleDir = -(a / pathVec.count);
              }
            }
          } else {
            pathVec.angleCount = 0;
          }
        }
        pathVector.push(pathVec);
        curr.prevAngle = pathVec.angle;
        return curr;
      });

      function* ScrollPosIterator() {
        let angle = pathVector[0].angle;
        for (const path of pathVector) {
          let x = path.start[0];
          let y = path.start[1];

          let angleCount = path.angleCount || 0;
          let angleDir = path.angleDir;

  //        yield { x: x, y: y, angle: angle };

          for (let i = 0; i < path.count; ++i) {
            if (angleCount) {
              //        while(angleCount){
              angle += angleDir;
              //          yield {x:x,y:y,angle:angle};
              --angleCount;
              //      }
            } else {
              angle = path.angle;
            }
            x += path.dir[0];
            y += path.dir[1];
            yield { x: x, y: y, angle: angle };
          }
          angle = path.angle;
        }
      }

      let scrollPos = ScrollPosIterator();



      // const scrollManager = {
      //   current:pathVector[0]

      // };

      //con.vscreen.appendScene(vox);

      // cube.source.translation[2] = 0;
      // //m4.scale(cube.localMatrix,[20,20,20],cube.localMatrix);
      // cube.source.scale = vec3.fromValues(50,50,50);
      //con.vscreen.appendScene(cube);

      // const cube2 = new SceneNode(model);
      // cube2.source.translation = vec3.fromValues(2,0,0);

      // cube2.source.scale = vec3.fromValues(0.5,0.5,0.5);

      // con.vscreen.appendScene(cube2,cube);


      // WebAssembly側のメモリ
      let mem;

      // コンパイル時に引き渡すオブジェクト
      // envというプロパティにエクスポートしたいものを入れる

      const exportToWasm = {
        env: {
          consoleLogString: consoleLogString,
          consoleValue: consoleValue,
          acos: Math.acos,
          acosh: Math.acosh,
          asin: Math.asin,
          asinh: Math.asinh,
          atan: Math.atan,
          atanh: Math.atanh,
          atan2: Math.atan2,
          cbrt: Math.cbrt,
          ceil: Math.ceil,
          clz32: Math.clz32,
          cos: Math.cos,
          cosh: Math.cosh,
          exp: Math.exp,
          expm1: Math.expm1,
          floor: Math.floor,
          fround: Math.fround,
          imul: Math.imul,
          log: Math.log,
          log1p: Math.log1p,
          log10: Math.log10,
          log2: Math.log2,
          pow: Math.pow,
          round: Math.round,
          sign: Math.sign,
          sin: Math.sin,
          sinh: Math.sinh,
          sqrt: Math.sqrt,
          tan: Math.tan,
          tanh: Math.tanh
        }
      };

      function consoleValue(v) {
        console.log(v);
      }

      function consoleLogString(index) {

        // 先頭の4byte(uint32)に文字列の長さが入っている
        const length = mem.getUint32(index, true);

        // 文字列は長さの後に続けて入っている
        const array = new Uint16Array(mem.buffer, index + 4, length);
        const str = new TextDecoder('utf-16').decode(array);
        //const str = String.fromCharCode(...array);
        alert(str);
      }

      // WebAssembly.instantiateStreaming(fetch("./wa/test.wasm"),exportToWasm).then(mod => {
      //   const test = mod.instance.exports.test;
      //   mem = new DataView(mod.instance.exports.memory.buffer);
      //   test();
      // });

      let prevx = 0;
      let time = 0;
      function main() {
        let v = scrollPos.next();
        if (!v.done) {
          map.x = v.value.x;
          map.y = v.value.y;
          map.angle = v.value.angle;
          console.log(v.value.x - prevx);
          prevx = v.value.x;
        }
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
      throw e;
      //alert(e.stack);
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
//# sourceMappingURL=main.js.map
