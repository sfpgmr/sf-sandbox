import EventEmitter from "eventemitter3";
export default class TimeLine extends EventEmitter
{
  constructor(events = []){
    super();
    this.index = 0;
    this.events = events;
    this.events.length > 0 && this.events.sort((a,b)=>a.time - b.time);
  }

  add(time,func){
    this.events.push({time:time,func:func});
    this.events.sort((a,b)=>a.time - b.time);
  }

  update(time){
    while(this.index < this.events.length && time >= this.events[this.index].time){
      this.events[this.index].func(time);
      this.index += 1;
    }
    if(this.index >= this.events.length){
      this.emit('end');
    }
  }

  skip(time){
    while(this.index < this.events.length && time > this.events[this.index].time){
      this.index += 1;
    }
  }
}
