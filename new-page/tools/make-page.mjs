
import fs from 'fs';
import ejs from 'ejs';

(async () => {
  const tweetsOriginal =
    JSON.parse(await fs.promises.readFile('./data/tweets.json', 'utf8'))
      .sort((a, b) => {
        const ad = new Date(a.created_at), bd = new Date(b.created_at);

        if (ad < bd) {
          return -1;
        }
        if (ad > bd) {
          return 1;
        }
        return 0;
      });
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

  const html = await ejs.renderFile('./current/src/ejs/index.ejs', { tweets: tweets });
  await fs.promises.writeFile('./current/src/html/index.html', html, 'utf8');
})();
