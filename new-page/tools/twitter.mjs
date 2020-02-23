import Twitter from 'twitter';
import fs from 'fs';
import util from 'util';

//import sqlite3 from 'sqlite3';

try {
  const client = new Twitter({
    consumer_key: process.env.TWCKEY,
    consumer_secret: process.env.TWCSECRET,
    access_token_key: process.env.TWAKEY,
    access_token_secret: process.env.TWASECRET
  });

  // const db = new sqlite3.Database("./data/data.db");
  // db.serialize(()=>{
  //   db.run("create table if not exists contents(id int primary key autoincrement,type text,value json)");
  // });

  
  const params = { 
    screen_name: 'sfpgmr',
    trim_user:false,
    include_rts:true,
    count:200,
    tweet_mode:'extended'
  };

  const getTweets = util.promisify(client.get.bind(client));
  const tweetData = [];
  (async ()=>{
    while(true){
      const tweets = await getTweets('statuses/user_timeline', params);
      if(tweets.length == 0) {
        break;
      }
      if(params.max_id){
        tweetData.push(...(tweets.slice(1)));
      } else {
        tweetData.push(...tweets);
      }
      // tweets.sort((a,b)=>{
      //   if(a.id < b.id) {
      //     return 1;
      //   }

      //   if(a.id > b.id) {
      //     return -1;
      //   }        

      //   return 0;
      // });
      const last = tweets[tweets.length - 1];
      params.max_id = last.id;
      console.log(tweets.length,last.id,last.created_at);
    }
    await fs.promises.writeFile('../data/tweets.json', JSON.stringify(tweetData, null, 2), 'utf8');
  })();
} catch (error){
  console.error(error);
}
