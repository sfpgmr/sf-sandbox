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

  
  const params = { screen_name: 'sfpgmr',trim_user:true,include_rts:true,count:200,        tweet_mode:'extended'
};
  const getTweets = util.promisify(client.get.bind(client));
  
  (async ()=>{
    const tweets = await getTweets('statuses/user_timeline', params);
    await fs.promises.writeFile('./data/tweets.json', JSON.stringify(tweets, null, 2), 'utf8');
  })();
} catch (error){
  console.error(error);
}
