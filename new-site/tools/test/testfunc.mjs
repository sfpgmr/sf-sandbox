globalThis.data = [];
const funcsrc = `data.push(1)`;
const fn = new Function("dt",funcsrc);
fn();
console.log(globalThis.data);