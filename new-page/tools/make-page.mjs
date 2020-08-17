
import fs from 'fs';
import ejs from 'ejs';
import Database from 'better-sqlite3';



(async () => {
  
  let outputPath = '../data/rendered/';

  if(process.argv[2]){
    outputPath = process.argv[2];
  }

  const db = new Database('../data/tweets.db');
  const stmt = db.prepare('select tweet from tweets order by id');
  let tweetsOriginal = stmt.all();
  tweetsOriginal = tweetsOriginal.map(d=>JSON.parse(d.tweet));
 
  // const tweetsOriginal =
  //   JSON.parse(await fs.promises.readFile('./data/tweet2.json', 'utf8'))
  //     .sort((a, b) => {
  //       const ad = a.id, bd = b.id;

  //       if (ad < bd) {
  //         return -1;
  //       }
  //       if (ad > bd) {
  //         return 1;
  //       }
  //       return 0;
  //     });
  const tweets = [];
  tweetsOriginal.forEach(tweet => {
    if (!tweet.in_reply_to_status_id) {
      tweets.push([tweet]);
    }
  });


  tweetsOriginal.forEach(tweet => {
    if (tweet.in_reply_to_status_id) {
      if (!tweets.some(t => {
        if (t.some(e => e.id == tweet.in_reply_to_status_id)) {
          t.push(tweet);
          return true;
        }
        return false;
      })) {
        tweets.push([tweet]);
      };
    }
  });


  tweets.sort((a,b)=>{
    
    const ad = a.map(e=>new Date(e.created_at)).reduce((pv,cv)=>{
      return pv > cv ? pv : cv;
    });

    const bd = b.map(e=>new Date(e.created_at)).reduce((pv,cv)=>{
      return pv > cv ? pv : cv;
    });

    if (ad < bd) {
      return 1;
    }
    if (ad > bd) {
      return -1;
    }
    return 0;

  });

  //await fs.promises.writeFile('./data/tweets3.json',JSON.stringify(tweets,null,1),'utf8');
  //tweets.length = 100;

  let page = 0;
  while (tweets.length > 0){
    const tweetFragments = tweets.splice(0,10);
    const fname = `index${!page?'':page}.html`;
    const url = "./" + fname;
    const html = await ejs.renderFile('../current/src/ejs/index.ejs', 
    { tweets: tweetFragments,
      meta:{
        title:'Twitter Viewer',
        description:'自作Twitter Viewerによる自分のつぶやきの記録。Programming,Music,HTML5,WebGL,javascript,WebAudio,Gameなど',
        url:url,
        imageUrl:'https://www.sfpgmr.net/img/sfweb.png',
        siteName:'S.F. Web',
        keywords:'Programming,Music,HTML5,WebGL,javascript,WebAudio',
        twitterSite:'@sfpgmr'
      }
  
    });
    await fs.promises.writeFile(`${outputPath}${fname}`, html, 'utf8');
    ++page;
  }
  const metaData = {maxContents:page};
  await fs.promises.writeFile(`${outputPath}metaData.json`,JSON.stringify(metaData),'utf8');

})();
