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

  const DEVICE_KEY_MOUSE = 1;
  const DEVICE_GAMEPAD = 2;

  /*

  */

  class Key {
    constructor(code) {
      this.code = code;
      this.pressed = false;
      this.hit = false;
      this.pressedBefore = false;
    }

    get code(){
      return this.code_;
    }
    
    set code(v){
      this.code_ = v;
      if(v == ' '){
        this.name = 'Space';
      } else {
        this.name = v;
      }
    }

    update(v) {
      if(v && this.pressed) return;
      this.pressedBefore = this.pressed;
      this.pressed = v;
      this.hit = v;//!this.pressedBefore && this.pressed;
    }

    get hit(){
      const r = this.hit_;
      this.hit_ = false;
      return r;
    }

    set hit(v){
      this.hit_ = v;
    }

    clear(){
      this.pressed = false;
      this.hit = false;
      this.pressedBefore = false;
    }

    get value(){return this.code;}
    set value(v){this.code = v;}
  }

  class BasicDevice {
    constructor() {
      this.deviceId = DEVICE_KEY_MOUSE;
      this.name = 'Keyboard/Mouse';
      this.keys = {
        up: new Key('ArrowUp'), down: new Key('ArrowDown'), left: new Key('ArrowLeft'), right: new Key('ArrowRight'), shoot1: new Key('z'), shoot2: new Key('x'), shoot3: new Key('c'), shoot4: new Key('v'), start: new Key(' '), back: new Key('Escape')//,guide: new Key(81)
      };
      this.useMouse = false;
      this.mouseSensitivity = 0.1;
      this.keyBuffer = [];
    }

    get up() {
      return this.keys.up;
    }

    get down() {
      return this.keys.down;
    }

    get left() {
      return this.keys.left;
    }

    get right() {
      return this.keys.right;
    }

    get shoot1() {
      return this.keys.shoot1;
    }

    get shoot2() {
      return this.keys.shoot2;
    }

    get shoot3() {
      return this.keys.shoot3;
    }

    get shoot4() {
      return this.keys.shoot4;
    }

    get start() {

      return this.keys.start;
    }

    get back() {
      return this.keys.back;
    }

    // get guide() {
    //   return this.keys.guide;
    // }

    bind() {
      if(!this.bind_){
        this.bind_ = true;
        document.body.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.body.addEventListener('keyup', this.handleKeyUp.bind(this));
      }
    }

    unbind() {
      if(this.bind_){
        this.bind_ = false;
        document.body.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.body.removeEventListener('keyup', this.handleKeyUp.bind(this));
      }
    }

    handleKeyDown(e) {
      const keyBuffer = this.keyBuffer;
      const keys = this.keys;

      let handle = false;

      if (keyBuffer.length > 16) {
        keyBuffer.shift();
      }

      keyBuffer.push({key:e.key,ctrlKey:e.ctrlKey,altKey:e.altKey,shiftKey:e.shiftKey,metaKey:e.metaKey});
      //console.log(e.keyCode);

      switch (e.key) {
        case keys.left.code:
          keys.left.update(true);
          handle = true;
          break;
        case keys.up.code:
          keys.up.update(true);
          handle = true;
          break;
        case keys.right.code:
          keys.right.update(true);
          handle = true;
          break;
        case keys.down.code:
          keys.down.update(true);
          handle = true;
          break;
        case keys.shoot1.code:
          keys.shoot1.update(true);
          handle = true;
          break;
        case keys.shoot2.code:
          keys.shoot2.update(true);
          handle = true;
          break;
        case keys.shoot3.code:
          keys.shoot3.update(true);
          handle = true;
          break;
        case keys.shoot4.code:
          keys.shoot4.update(true);
          handle = true;
          break;
        case keys.start.code:
          keys.start.update(true);
          handle = true;
          break;
        case keys.back.code:
          keys.back.update(true);
          handle = true;
          break;
        // case keys.guide.code:
        //   keys.guide.update(true);
        //   handle = true;
        //   break;
      }

      if (handle) {
        e.preventDefault();
        e.returnValue = false;
        return false;
      }

    }

    handleKeyUp(e) {
      let keys = this.keys;
      let handle = false;
      switch (e.key) {
        case keys.left.code:
          keys.left.update(false);
          handle = true;
          break;
        case keys.up.code:
          keys.up.update(false);
          handle = true;
          break;
        case keys.right.code:
          keys.right.update(false);
          handle = true;
          break;
        case keys.down.code:
          keys.down.update(false);
          handle = true;
          break;
        case keys.shoot1.code:
          keys.shoot1.update(false);
          handle = true;
          break;
        case keys.shoot2.code:
          keys.shoot2.update(false);
          handle = true;
          break;
        case keys.shoot3.code:
          keys.shoot3.update(false);
          handle = true;
          break;
        case keys.shoot4.code:
          keys.shoot4.update(false);
          handle = true;
          break;
        case keys.start.code:
          keys.start.update(false);
          handle = true;
          break;
        case keys.back.code:
          keys.back.update(false);
          handle = true;
          break;
        // case keys.guide.code:
        //   keys.guide.update(false);
        //   handle = true;
        //   break;
      }

      if (handle) {
        e.preventDefault();
        e.returnValue = false;
        return false;
      }
    }

    clear() {
      for (var d in this.keys) {
        this.keys[d].clear();
      }
      this.keyBuffer.length = 0;
    }

    update(){

    }

    get lastPressedKey(){
      return this.keyBuffer.length > 0 ? this.keyBuffer[this.keyBuffer.length - 1] : null;
    }

  }


  const gamePadButtons = {
    0: 'A',
    1: 'B',
    2: 'X',
    3: 'Y',
    4: 'LB',
    5: 'RB',
    6: 'LT',
    7: 'RT',
    8: 'BACK',
    9: 'START',
    10: 'AXIS L',
    11: 'AXIS R',
    12: 'UP',
    13: 'DOWN',
    14: 'LEFT',
    15: 'RIGHT'//,
  //  16: 'GUIDE'
  };

  class Button {
    constructor(index) {
      this.index = index;
      this.pressed = false;
      this.hit = false;
      this.pressedBefore = false;
    }

    get index(){
      return this.index_;
    }

    set index(v){
      this.index_ = v;
      this.name =  gamePadButtons[v];
    }
    
    get hit(){
      const r = this.hit_;
      this.hit_ = false;
      return r;
    }

    set hit(v){
      this.hit_ = v;
    }

    update(v,v1) {
      if((v.pressed && this.pressed) || (v1 && this.pressed)) return;
      this.pressedBefore = this.pressed;
      this.pressed = !!(v.pressed || v1);
      this.hit = v.pressed || v1;//!this.pressedBefore && v.pressed;
    }

    get value(){return this.index;}
    set value(v){this.index = v;}
    
  }

  class GamePad extends EventEmitter {
    constructor() {
      super();

      this.deviceId = DEVICE_GAMEPAD;
      this.name = 'GamePad';

      if (window.navigator.getGamepads) {
        this.gamepads = Array.prototype.slice.call(window.navigator.getGamepads());
        if(!this.gamepads) this.gamepads = [];
        this.support = this.gamepads.length > 0;
      }

      if(this.support){
        for(let i = 0,e = this.gamepads.length;i < e;++i){
          if(this.gamepads[i] && this.gamepads[i].connected){
            this.current = this.gamepads[i];
            break;
          }
        }
        if(!this.current){
          this.support = false;
        }
      }

      if(this.support){
        this.index = this.current.index;
        this.id = this.current.id;
        this.connected = this.current.connected;
      }

      this.useAxis = false;
      this.axesSensitivity = 0.1;
      
      this.switches = {
        up: new Button(12),
        down: new Button(13),
        left: new Button(14),
        right: new Button(15),
        shoot1: new Button(1),
        shoot2: new Button(2),
        shoot3: new Button(3),
        shoot4: new Button(0),
        start: new Button(9),
        back: new Button(8)//,
  //      guide: new Button(16)
      };

      window.addEventListener('gamepadconnected', (e) => {
        const gamepad = e.gamepad;
        this.gamepads[gamepad.index] = gamepad;

        if(this.support){
          if(this.id == gamepad.id ) {
            if(!this.connected){
              this.connected = true;
              this.clear();
            }
          } 
          // すでにつながっているものがあるため、何もしない。
        } else {
          // 何もつながっていない状態
          this.current = gamepad;
          this.id = this.current.id;
          this.index = this.current.index;
          this.connected = this.current.connected;
          this.clear();
          this.support = true;
        }      

        this.emit('gamepadConnected',e.gamepad);

        // debugger;
        

      });

      // ゲームパッドが外されたときに処理
      window.addEventListener('gamepaddisconnected', (e) => {
        const gamepad = e.gamepad;
        // 外されたものが今使ってるものかどうか
        if(this.id == gamepad.id && !gamepad.connected){
          // 今使っているものが外された！
          this.connected = false;

          this.gamepads = Array.prototype.slice.call(window.navigator.getGamepads());
          
          // 代替のGamePadを探す
          if(!this.findConnectedGamePad()){
            // 見つからない場合は無効化してイベントをディスパッチ！
            this.support = false;
            this.connected = false;
            this.emit('gamepadDisabled');
          }
        }
        //delete this.gamepad;
      });
    }

    findConnectedGamePad(){
      this.gamepads = Array.prototype.slice.call(window.navigator.getGamepads());
      let found = false;
      for(let i = 0,e = this.gamepads.length;i < e;++i){
        const gamepad = this.gamepads[i];
        if(gamepad && this.id != gamepad.id && gamepad.connected){
          this.id = gamepad.id;
          this.index = gamepad.index;
          this.connected = gamepad.connected;
          this.clear();
          found = true;
          break;
        }
      }
      return found;
    }

    change(index){
      this.current = this.gamepads[index];
      this.id = this.current.id;
      this.connected = this.current.connected;
      this.index = this.current.index;
      this.clear();
    }

    get up() {
      return this.switches.up;
    }

    get down() {
      return this.switches.down;
    }

    get left() {
      return this.switches.left;
    }

    get right() {
      return this.switches.right;
    }

    get shoot1() {
      return this.switches.shoot1;
    }

    get shoot2() {
      return this.switches.shoot2;
    }

    get shoot3() {
      return this.switches.shoot3;
    }

    get shoot4() {
      return this.switches.shoot4;
    }

    get start() {
      return this.switches.start;
    }

    get back() {
      return this.switches.back;
    }

    // get guide() {
    //   return this.switches.guide;
    // }

    update(){
      if(window.navigator.getGamepads){
        this.gamepads = Array.prototype.slice.call(window.navigator.getGamepads());
        this.current = this.gamepads[this.index];
        if(!this.current || !this.current.connected){
          if(!this.findConnectedGamePad()){
            this.support = false;
            this.connected = false;
            this.emit('gamepadDisabled');
            return;
          }
        }
        this.connected = this.current.connected;
        // switchのアップデート
        const switches = this.switches;
        const buttons = this.current.buttons;
        
        const axes0 = this.current.axes[0];
        const axes1 = this.current.axes[1];

        switches.up.update(buttons[switches.up.index],axes1 < -this.axesSensitivity );
        switches.down.update(buttons[switches.down.index],axes1 > this.axesSensitivity);
        switches.left.update(buttons[switches.left.index],axes0 < -this.axesSensitivity );
        switches.right.update(buttons[switches.right.index],axes0 > this.axesSensitivity);
        switches.shoot1.update(buttons[switches.shoot1.index]);
        switches.shoot2.update(buttons[switches.shoot2.index]);
        switches.shoot3.update(buttons[switches.shoot3.index]);
        switches.shoot4.update(buttons[switches.shoot4.index]);
        switches.start.update(buttons[switches.start.index]);
        switches.back.update(buttons[switches.back.index]);
  //      switches.guide.update(buttons[switches.guide.index]);
      }
    }

    clear() {
      for (var d in this.keys) {
        this.buttons[d].clear();
      }
    }
  }

  // キー入力
  class BasicInput {
    constructor() {

      this.basicDevice = new BasicDevice();

      this.gamepad = new GamePad();

      this.gamepad.on('gamepadConnected',(gamepad)=>{
        // GamePadが接続されているときはGamePadを優先して使う
        //debugger;
        this.currentDevice = this.gamepad;

        if(this.data){
          if(this.data.deviceId == DEVICE_GAMEPAD 
              && this.data.gamepadIndex == gamepad.index
              && this.data.gamepadId == gamepad.id){
                this.gamepad.change(gamepad.index);
                this.load_(this.data);
          }
        }
        this.basicDevice.unbind();
      });

      this.gamepad.on('gamepadDisabled',()=>{
        this.currentDevice = this.basicDevice;
        this.bind_ && this.currentDevice.bind();
        this.currentDevice.clear();
      });
      
      if(this.gamepad.support){
        this.currentDevice = this.gamepad;
      } else {
        this.currentDevice = this.basicDevice;
      }

      !this.load() && this.save();

    }

    changeDevice(device = DEVICE_KEY_MOUSE){
      switch(device){
        case DEVICE_KEY_MOUSE:
          this.currentDevice = this.basicDevice;
          if(this.bind_) {
            this.basicDevice.bind();
          } else {
            this.basicDevice.unbind();
          }
          this.currentDevice.clear();
          break;
        case DEVICE_GAMEPAD:
          if(this.gamepad){
            this.currentDevice = this.gamepad;
            this.currentDevice.clear();
              this.currentDevice.clear();
          }
          break;
      }
    }

    clear() {
      this.currentDevice.clear();
    }

    //イベントにバインドする
    bind() {
      this.bind_ = true;
      this.currentDevice.bind && this.currentDevice.bind(); 
    }
    // アンバインドする
    unbind() {
      this.bind_ = false;
      this.currentDevice.unbind && this.currentDevice.unbind(); 
    }

    get up() {
      return this.currentDevice.up;
    }

    get down() {
      return this.currentDevice.down;
    }

    get left() {
      return this.currentDevice.left;
    }

    get right() {
      return this.currentDevice.right;
    }

    get start() {
      return this.currentDevice.start;
    }

    get back() {
      return this.currentDevice.back;
    }

    // get guide() {
    //   return this.currentDevice.guide;
    // }

    get shoot1() {
      return this.currentDevice.shoot1;
    }
    get shoot2() {
      return this.currentDevice.shoot2;
    }
    get shoot3() {
      return this.currentDevice.shoot3;
    }

    get shoot4() {
      return this.currentDevice.shoot4;
    }


    get pov() {
      // if(this.gamepad){
      //   return ((this.gamepad.axes[9] + 1) * 7 / 2 + 0.5) | 0;
      // }
      return -1;
    }

    update() {
      this.currentDevice.update();
    }

    save(config = {})
    {
      const this_ = this;
      const data = {
        deviceId:this_.currentDevice.deviceId,
        gamepadIndex:this_.gamepad.support && this_.gamepad.current.index,
        gamepadId:this_.gamepad.current && this_.gamepad.current.id,
        up:this_.currentDevice.up.value,
        down:this_.currentDevice.down.value,
        left:this_.currentDevice.left.value,
        right:this_.currentDevice.right.value,
        shoot1:this_.currentDevice.shoot1.value,
        shoot2:this_.currentDevice.shoot2.value,
        shoot3:this_.currentDevice.shoot3.value
      };
      config.input = data;
    }

    load(config){
      if(config){
        let data = config.input;
        if(data){
          this.data = data;
          if(data.deviceId == DEVICE_GAMEPAD && !this.gamepad.support){
            return true;
          }
          this.load_(data);
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }

    load_(data){
      let curDev = this.currentDevice;
      if(data.deviceId != curDev.deviceId){
        this.changeDevice(data.deviceId);
      }
      curDev = this.currentDevice;
      if(curDev.deviceId == DEVICE_GAMEPAD){
        if(!curDev.current || curDev.current.index != data.gamepadIndex){
          curDev.change(data.gamepadIndex);
        }
      }
      curDev.up.value = data.up;
      curDev.down.value = data.down;
      curDev.left.value = data.left;
      curDev.right.value = data.right;
      curDev.shoot1.value = data.shoot1;
      curDev.shoot2.value = data.shoot2;
      curDev.shoot3.value = data.shoot3;
    }
  }

  //The MIT License (MIT)

  // メイン
  window.addEventListener('load', async ()=>{

    const basicInput = new BasicInput();

    function step(){
      requestAnimationFrame(step);
      basicInput.update();
      const qs = document.querySelector.bind(document);
      qs('#up').innerHTML = basicInput.up.pressed;
      qs('#down').innerHTML = basicInput.down.pressed;
      qs('#left').innerHTML = basicInput.left.pressed;
      qs('#right').innerHTML = basicInput.right.pressed;
      qs('#start').innerHTML = basicInput.start.pressed;
      qs('#back').innerHTML = basicInput.back.pressed;
      qs('#shoot1').innerHTML = basicInput.shoot1.pressed;
      qs('#shoot2').innerHTML = basicInput.shoot2.pressed;
      qs('#shoot3').innerHTML = basicInput.shoot3.pressed;
      qs('#shoot4').innerHTML = basicInput.shoot4.pressed;
      qs('#key-up').innerHTML = basicInput.up.name;
      qs('#key-down').innerHTML = basicInput.down.name;
      qs('#key-left').innerHTML = basicInput.left.name;
      qs('#key-right').innerHTML = basicInput.right.name;
      qs('#key-start').innerHTML = basicInput.start.name;
      qs('#key-back').innerHTML = basicInput.back.name;
      qs('#key-shoot1').innerHTML = basicInput.shoot1.name;
      qs('#key-shoot2').innerHTML = basicInput.shoot2.name;
      qs('#key-shoot3').innerHTML = basicInput.shoot3.name;
      qs('#key-shoot4').innerHTML = basicInput.shoot4.name;
    }

    requestAnimationFrame(step);

    window.addEventListener( 'resize', ()=>{
    }
    , false );

    basicInput.bind();
    
  });

}());
