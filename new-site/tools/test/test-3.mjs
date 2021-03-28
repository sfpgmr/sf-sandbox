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