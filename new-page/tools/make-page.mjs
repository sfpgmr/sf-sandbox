
import fs from 'fs';
import ejs from 'ejs';
import YouTube from 'youtube-node';
import util from 'util';

const yt = new YouTube();
yt.setKey(process.env.YOUTUBE_API_KEY);

const youtube = {
    search:util.promisify(yt.search.bind(yt)),
    getById:util.promisify(yt.getById.bind(yt)),
    related:util.promisify(yt.related.bind(yt))
};


(async () => {
  const tweetsOriginal =
    JSON.parse(await fs.promises.readFile('./data/tweets.json', 'utf8'))
      .sort((a, b) => {
        const ad = a.id, bd = b.id;

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

  const html = await ejs.renderFile('./current/src/ejs/index.ejs', { tweets: tweets,youtube:youtube });
  await fs.promises.writeFile('./current/src/html/index.html', html, 'utf8');
})();
