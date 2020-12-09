
import fs from 'fs';
globalThis.a = 10;

(new Function('a',`
(async()=>{
  const fs = await import('fs');
  const f =  new Function('return b');
  console.log(fs);
})();
`))(10);