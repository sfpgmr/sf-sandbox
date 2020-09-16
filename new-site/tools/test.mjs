
globalThis.a = 10;
(new Function('a',`
globalThis.b = 10;
const f =  new Function('return b');
console.log(f());
`))(10);