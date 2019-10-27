
import fs from 'fs';
import ejs from 'ejs';

(async ()=>{
  const tweets = JSON.parse(await fs.promises.readFile('./data/tweet2.json','utf8'));
  //tweets.length = 20;
  const html = await ejs.renderFile('./tools/ejs/index.ejs',{tweets:tweets});
  await fs.promises.writeFile('./current/src/html/index.html',html,'utf8');
})();