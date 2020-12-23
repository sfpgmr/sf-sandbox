function anonymous(obj
) {

   let location;
   try {
   
  //buildInAttr.cache = new Map();
  let outputStr = '';

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
location = {"start":{"offset":0,"line":1,"column":1},"end":{"offset":67,"line":5,"column":1}};
const incA = 'aa';
  const incB = 'cc';

location = {"start":{"offset":67,"line":5,"column":1},"end":{"offset":72,"line":5,"column":6}};
output(`<div>`);
location = {"start":{"offset":74,"line":6,"column":2},"end":{"offset":77,"line":6,"column":5}};
output(`<p>`);
location = {"start":{"offset":81,"line":7,"column":4},"end":{"offset":88,"line":7,"column":11}};
output(`incA = `);
location = {"start":{"offset":88,"line":7,"column":11},"end":{"offset":95,"line":7,"column":18}};
output(`${escapeHtml(incA)}`);
location = {"start":{"offset":95,"line":7,"column":18},"end":{"offset":103,"line":8,"column":4}};
output(`<br>`);
location = {"start":{"offset":103,"line":8,"column":4},"end":{"offset":110,"line":8,"column":11}};
output(`incB = `);
location = {"start":{"offset":110,"line":8,"column":11},"end":{"offset":117,"line":8,"column":18}};
output(`${escapeHtml(incB)}`);
location = {"start":{"offset":117,"line":8,"column":18},"end":{"offset":119,"line":9,"column":2}};
output(`
 `);
location = {"start":{"offset":74,"line":6,"column":2},"end":{"offset":77,"line":6,"column":5}};
output(`</p>`);
location = {"start":{"offset":125,"line":10,"column":1},"end":{"offset":128,"line":10,"column":4}};
output(`<p>`);
location = {"start":{"offset":131,"line":11,"column":3},"end":{"offset":146,"line":12,"column":1}};
output(`test-2-include
`);
location = {"start":{"offset":125,"line":10,"column":1},"end":{"offset":128,"line":10,"column":4}};
output(`</p>`);
location = {"start":{"offset":67,"line":5,"column":1},"end":{"offset":72,"line":5,"column":6}};
output(`</div>`);
undefinedlocation = {"start":{"offset":81,"line":7,"column":3},"end":{"offset":170,"line":11,"column":3}};
const title = 'test title';
    const alt = 'test alt';
  
location = {"start":{"offset":170,"line":11,"column":3},"end":{"offset":188,"line":12,"column":3}};
output(`<!DOCTYPE html>`);
location = {"start":{"offset":188,"line":12,"column":3},"end":{"offset":240,"line":12,"column":55}};
output(`<html amp>`);
location = {"start":{"offset":244,"line":14,"column":3},"end":{"offset":262,"line":14,"column":21}};
if(alt){
location = {"start":{"offset":244,"line":14,"column":3},"end":{"offset":262,"line":14,"column":21}};
}

location = {"start":{"offset":276,"line":17,"column":3},"end":{"offset":282,"line":17,"column":9}};
output(`<body>`);
location = {"start":{"offset":287,"line":18,"column":5},"end":{"offset":316,"line":18,"column":34}};
if(title){
location = {"start":{"offset":323,"line":19,"column":7},"end":{"offset":328,"line":19,"column":12}};
output(`title`);
location = {"start":{"offset":328,"line":19,"column":12},"end":{"offset":334,"line":19,"column":18}};
output(`${escapeHtml(alt)}`);
location = {"start":{"offset":334,"line":19,"column":18},"end":{"offset":339,"line":20,"column":5}};
output(`
    `);
location = {"start":{"offset":287,"line":18,"column":5},"end":{"offset":316,"line":18,"column":34}};
}

location = {"start":{"offset":350,"line":21,"column":5},"end":{"offset":353,"line":21,"column":8}};
output(`<p>`);
location = {"start":{"offset":360,"line":22,"column":7},"end":{"offset":368,"line":22,"column":15}};
output(`${escapeHtml(title)}`);
location = {"start":{"offset":368,"line":22,"column":15},"end":{"offset":369,"line":22,"column":16}};
output(` `);
location = {"start":{"offset":369,"line":22,"column":16},"end":{"offset":377,"line":22,"column":24}};
output(`${escapeHtml(title)}`);
location = {"start":{"offset":377,"line":22,"column":24},"end":{"offset":378,"line":22,"column":25}};
output(` `);
location = {"start":{"offset":378,"line":22,"column":25},"end":{"offset":386,"line":22,"column":33}};
output(`${escapeHtml(title)}`);
location = {"start":{"offset":386,"line":22,"column":33},"end":{"offset":391,"line":23,"column":5}};
output(`
    `);
location = {"start":{"offset":350,"line":21,"column":5},"end":{"offset":353,"line":21,"column":8}};
output(`</p>`);
location = {"start":{"offset":400,"line":24,"column":5},"end":{"offset":437,"line":24,"column":42}};
if(title == 'test title'){
location = {"start":{"offset":442,"line":25,"column":5},"end":{"offset":512,"line":28,"column":7}};
for (let i = 0;i < 10;++i) {
    
location = {"start":{"offset":512,"line":28,"column":7},"end":{"offset":517,"line":28,"column":12}};
output(`<div>`);
location = {"start":{"offset":517,"line":28,"column":12},"end":{"offset":521,"line":28,"column":16}};
output(`${escapeHtml(i)}`);
location = {"start":{"offset":512,"line":28,"column":7},"end":{"offset":517,"line":28,"column":12}};
output(`</div>`);
location = {"start":{"offset":533,"line":30,"column":5},"end":{"offset":576,"line":33,"column":7}};
}
    
location = {"start":{"offset":576,"line":33,"column":7},"end":{"offset":581,"line":33,"column":12}};
output(`<div>`);
location = {"start":{"offset":581,"line":33,"column":12},"end":{"offset":583,"line":33,"column":14}};
output(`if`);
location = {"start":{"offset":576,"line":33,"column":7},"end":{"offset":581,"line":33,"column":12}};
output(`</div>`);
location = {"start":{"offset":596,"line":34,"column":7},"end":{"offset":614,"line":35,"column":9}};

} else {

location = {"start":{"offset":614,"line":35,"column":9},"end":{"offset":619,"line":35,"column":14}};
output(`<div>`);
location = {"start":{"offset":619,"line":35,"column":14},"end":{"offset":623,"line":35,"column":18}};
output(`else`);
location = {"start":{"offset":614,"line":35,"column":9},"end":{"offset":619,"line":35,"column":14}};
output(`</div>`);
location = {"start":{"offset":638,"line":36,"column":9},"end":{"offset":647,"line":37,"column":5}};
output(`<hr>`);
location = {"start":{"offset":400,"line":24,"column":5},"end":{"offset":437,"line":24,"column":42}};
}

location = {"start":{"offset":660,"line":38,"column":5},"end":{"offset":669,"line":39,"column":5}};
output(`<hr>`);
location = {"start":{"offset":669,"line":39,"column":5},"end":{"offset":681,"line":40,"column":7}};
output(`<div>`);
location = {"start":{"offset":681,"line":40,"column":7},"end":{"offset":695,"line":41,"column":9}};
output(`<div>`);
location = {"start":{"offset":730,"line":45,"column":9},"end":{"offset":890,"line":52,"column":9}};
const c = 'aa<aa></aa>';
          let a = 'aa';
          if(c.match(/aa/)) {
          a = 10;
          }
        
location = {"start":{"offset":890,"line":52,"column":9},"end":{"offset":893,"line":52,"column":12}};
output(`<p>`);
location = {"start":{"offset":893,"line":52,"column":12},"end":{"offset":897,"line":52,"column":16}};
output(`a = `);
location = {"start":{"offset":897,"line":52,"column":16},"end":{"offset":901,"line":52,"column":20}};
output(`${escapeHtml(a)}`);
location = {"start":{"offset":890,"line":52,"column":9},"end":{"offset":893,"line":52,"column":12}};
output(`</p>`);
location = {"start":{"offset":914,"line":53,"column":9},"end":{"offset":917,"line":53,"column":12}};
output(`<p>`);
location = {"start":{"offset":917,"line":53,"column":12},"end":{"offset":921,"line":53,"column":16}};
output(`c = `);
location = {"start":{"offset":921,"line":53,"column":16},"end":{"offset":925,"line":53,"column":20}};
output(`${escapeHtml(d)}`);
location = {"start":{"offset":914,"line":53,"column":9},"end":{"offset":917,"line":53,"column":12}};
output(`</p>`);
location = {"start":{"offset":938,"line":54,"column":9},"end":{"offset":994,"line":57,"column":3}};
output(c);
        
location = {"start":{"offset":276,"line":17,"column":3},"end":{"offset":282,"line":17,"column":9}};
output(`</body>`);
location = {"start":{"offset":188,"line":12,"column":3},"end":{"offset":240,"line":12,"column":55}};
output(`</html>`);

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