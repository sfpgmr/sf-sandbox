function anonymous(ast,plugins,pluginsAttr,Location,templates
) {

  

  //buildInAttr.cache = new Map();
  let outputStr = '';
  let location = new Location();

  function output(obj,escapeString = false) {
    if (typeof (obj) == 'string' || obj instanceof String) {
      outputStr += escapeString ? escapehtml(obj) : obj;
    } else if (typeof (obj) == 'number' || typeof (obj) instanceof Number) {
      outputStr += obj;
    } else {
      const temp = JSON.stringify(obj, null, 1);
      outputStr += escapeString ? escapeHtml(temp) : temp;
    }
  }

  // 引用：
  // https://qiita.com/saekis/items/c2b41cd8940923863791
  function escapeHtml(string) {
    if(typeof string !== 'string') {
      return string;
    }
    return string.replace(/[&'`"<>]/g, match => {
      return {
        '&': '&amp;',
        "'": '&#x27;',
        '`': '&#x60;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;',
      }[match];
    });
  }
  

   try {
   location.set(0,1,1,5,1,6);
output(`<div>`);
location.set(5,1,6,9,1,10);
output(`test`);
location.set(0,1,1,5,1,6);
output(`</div>`);
location.set(16,2,1,22,3,1);
output(`<div>`);
location.set(22,3,1,101,9,1);
const c = 'aa<aa>';
  const a = 2;
  const b = 10;


location.set(101,9,1,106,9,6);
output(`<div>`);
location.set(106,9,6,110,9,10);
output(`${c}`);
location.set(101,9,1,106,9,6);
output(`</div>`);
location.set(117,10,1,122,10,6);
output(`<div>`);
location.set(122,10,6,126,10,10);
output(`@{c}`);
location.set(117,10,1,122,10,6);
output(`</div>`);
location.set(133,11,1,138,11,6);
output(`<div>`);
location.set(138,11,6,144,11,12);
output(`${a*b}`);
location.set(133,11,1,138,11,6);
output(`</div>`);

   return outputStr;
   } catch (e) {
     if(location){
      const errString = `line:${location.start.line}-${location.end.line},column:${location.start.column}-${location.end.column}:${e}`;
       throw(errString);
     } else {
       throw(e);
     }
   }
}