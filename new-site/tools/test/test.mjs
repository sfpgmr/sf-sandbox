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
   location.set(0,1,1,67,5,1);
const incA = 'aa';
  const incB = 'cc';

location.set(67,5,1,72,5,6);
output(`<div>`);
location.set(74,6,2,77,6,5);
output(`<p>`);
location.set(81,7,4,95,7,18);
output(`incA = ${incA}`);
location.set(95,7,18,103,8,4);
output(`<br>`);
location.set(103,8,4,119,9,2);
output(`incB = ${incB}
 `);
location.set(74,6,2,77,6,5);
output(`</p>`);
location.set(125,10,1,128,10,4);
output(`<p>`);
location.set(131,11,3,146,12,1);
output(`test-2-include
`);
location.set(125,10,1,128,10,4);
output(`</p>`);
location.set(67,5,1,72,5,6);
output(`</div>`);
location.set(42,2,1,168,2,127);
function ad (
width='100vx',height='80px',type='adsense',client,slot,auto_format='rspv',full_width){location.set(171,3,3,380,8,39);
output(`<amp-ad width height type data-ad-client data-ad-slot data-auto-format data-full-width>`);
location.set(385,9,5,402,9,22);
output(`<div overflow>`);
location.set(385,9,5,402,9,22);
output(`</div>`);
location.set(171,3,3,380,8,39);
output(`</amp-ad>`);
};location.set(484,17,3,596,22,3);
const title = 'test title';
    const alt = 'test alt';
    const scvar = 'v';
  
location.set(596,22,3,614,23,3);
output(`<!DOCTYPE html>`);
location.set(614,23,3,666,23,55);
output(`<html amp xmlns:sf="https://sfpgmr.net/sf-template">`);
location.set(670,25,3,700,25,33);
if(alt) {
location.set(670,25,3,700,25,33);
output(`<head alt="title">`);
location.set(705,27,4,735,28,4);
output(`<title>`);
location.set(712,27,11,722,27,21);
output(`${escapeHtml(title)}`);
location.set(705,27,4,735,28,4);
output(`</title>`);
location.set(735,28,4,815,32,3);
output(`<script>`);
output(`const `);
location.set(755,29,12,765,29,22);
output(`${escapeHtml(scvar)}`);
output(` = 1;
     const sc = \`\${{\$a:1}}\`;
   `);
location.set(735,28,4,815,32,3);
output(`</script>`);
location.set(670,25,3,700,25,33);
output(`</head>`);
location.set(670,25,3,700,25,33);
}
location.set(826,34,3,832,34,9);
output(`<body>`);
location.set(837,35,5,842,35,10);
output(`<div>`);
location.set(842,35,10,846,35,14);
output(`ast:`);
location.set(846,35,14,861,35,29);
output(`${escapeHtml(ast.length)}`);
location.set(837,35,5,842,35,10);
output(`</div>`);
location.set(872,36,5,901,36,34);
if(title) {
location.set(872,36,5,901,36,34);
output(`<div alt="alt">`);
location.set(908,37,7,913,37,12);
output(`title`);
location.set(913,37,12,921,37,20);
output(`${escapeHtml(alt)}`);
location.set(921,37,20,926,38,5);
output(`
    `);
location.set(872,36,5,901,36,34);
output(`</div>`);
location.set(872,36,5,901,36,34);
}
location.set(937,39,5,940,39,8);
output(`<p>`);
location.set(947,40,7,957,40,17);
output(`${escapeHtml(title)}`);
location.set(957,40,17,958,40,18);
output(` `);
location.set(958,40,18,968,40,28);
output(`${escapeHtml(title)}`);
location.set(968,40,28,969,40,29);
output(` `);
location.set(969,40,29,979,40,39);
output(`${escapeHtml(title)}`);
location.set(979,40,39,984,41,5);
output(`
    `);
location.set(937,39,5,940,39,8);
output(`</p>`);
location.set(993,42,5,1030,42,42);
if(title == 'test title'){
location.set(1035,43,5,1090,44,7);
for (let i = 0;i < 10;++i) {
location.set(1090,44,7,1095,44,12);
output(`<div>`);
location.set(1095,44,12,1101,44,18);
output(`${escapeHtml(i)}`);
location.set(1090,44,7,1095,44,12);
output(`</div>`);
location.set(1112,45,5,1138,46,5);
}
location.set(1138,46,5,1143,46,10);
output(`<div>`);
location.set(1143,46,10,1149,46,16);
output(`これはこれは`);
location.set(1138,46,5,1143,46,10);
output(`</div>`);
location.set(1162,47,7,1180,48,9);

} else {

location.set(1180,48,9,1185,48,14);
output(`<div>`);
location.set(1185,48,14,1189,48,18);
output(`else`);
location.set(1180,48,9,1185,48,14);
output(`</div>`);
location.set(1204,49,9,1213,50,5);
output(`<hr>`);
location.set(993,42,5,1030,42,42);
}

location.set(1226,51,5,1235,52,5);
output(`<hr>`);
location.set(1235,52,5,1247,53,7);
output(`<div>`);
location.set(1247,53,7,1253,54,1);
output(`<div>`);
location.set(1297,58,9,1449,65,9);
c = 'aa<aa></aa>';
          let a = 'aa';
          if(c.match(/aa/)) {
          a = 10;
          }
        
location.set(1449,65,9,1452,65,12);
output(`<p>`);
location.set(1452,65,12,1456,65,16);
output(`a = `);
location.set(1456,65,16,1462,65,22);
output(`${escapeHtml(a)}`);
location.set(1449,65,9,1452,65,12);
output(`</p>`);
location.set(1475,66,9,1478,66,12);
output(`<p>`);
location.set(1478,66,12,1482,66,16);
output(`c = `);
location.set(1482,66,16,1488,66,22);
output(`${escapeHtml(c)}`);
location.set(1475,66,9,1478,66,12);
output(`</p>`);
location.set(1501,67,9,1557,70,3);
output(c);
        
location.set(826,34,3,832,34,9);
output(`</body>`);
location.set(614,23,3,666,23,55);
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