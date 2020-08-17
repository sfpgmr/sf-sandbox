import Twitter from 'twitter';
import fs from 'fs';
import util from 'util';
import Database from 'better-sqlite3';



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
  let tweetData = [];
  (async ()=>{

    // DataBaseのオープン
    
    const db = new Database('../data/tweets.db');
    
    db.exec('create table if not exists tweets(id text primary key,tweet json,flags int default 0,created_at datetime default (datetime(CURRENT_TIMESTAMP)),updated_at datetime);');
    //db.exec('create trigger if not exists update_tweets before update on tweets begin update ')


    const insertStmt = db.prepare('replace into tweets(id,tweet) values(@id,@tweet);');
    const getMaxIdStmt = db.prepare('select max(id) as since_id from tweets where flags = 0;');
    const since_id = getMaxIdStmt.get();
    if(since_id.since_id) {
      params.since_id = since_id.since_id;
      console.log(params.since_id);
    }

    while(true){
      let tweets = await getTweets('statuses/user_timeline', params);
      if(tweets.length == 0) {
        break;
      }

      // if(params.since_id || params.max_id){
      //   tweets = tweets.slice(1);
      // }
      tweets.forEach(tweet => {
        insertStmt.run({id:BigInt(tweet.id),tweet:JSON.stringify(tweet)});
      });
      // tweets.sort((a,b)=>{
      //   if(a.id < b.id) {
      //     return 1;
      //   }

      //   if(a.id > b.id) {
      //     return -1;
      //   }        

      //   return 0;
      // });
      if(params.since_id){
        const first = tweets[tweets.length - 1];
        params.since_id = first.id;
        console.log(tweets.length,last.id,last.created_at);
      } else {
        const last = tweets[tweets.length - 1];
        params.max_id = last.id;
        console.log(tweets.length,last.id,last.created_at);
      }
    }
    db.close();
    // await fs.promises.writeFile('../data/tweets.json', JSON.stringify(tweetData, null, 2), 'utf8');
  })();
} catch (error){
  console.error(error);
}
