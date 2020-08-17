import fetch from 'node-fetch';
import fs from 'fs';
import util from 'util';
import Database from 'better-sqlite3';
import querystring from 'querystring';

(async () => {
  const db = new Database('../data/tweets-v2.db');

  db.exec('create table if not exists tweets(id text primary key,tweet json,flags int default 0,created_at datetime default (datetime(CURRENT_TIMESTAMP)),updated_at datetime,conversation_id text);');

  const insertStmt = db.prepare('replace into tweets(id,tweet,conversation_id) values(@id,@tweet,@conversation_id);');
  const getMaxIdStmt = db.prepare('select max(id) as since_id from tweets;');
  const since_id = getMaxIdStmt.get();
  const params = {
    query: 'from:sfpgmr',
    'tweet.fields': 'attachments,author_id,context_annotations,conversation_id,created_at,entities,geo,id,in_reply_to_user_id,lang,public_metrics,referenced_tweets,source,text,withheld',
    expansions: 'author_id,attachments.media_keys',
    'user.fields': 'created_at,description,name,pinned_tweet_id,profile_image_url,username,verified',
    max_results: 100,
    'media.fields': 'media_key,preview_image_url,type,url,width,height,duration_ms'
  };

  if (since_id.since_id) {
    params.since_id = since_id.since_id;
    console.log(params.since_id);
  }

  if(!params.since_id) {
    params.start_time='2009-10-01T00:00:00Z';
  }

  const qs_params = querystring.stringify(params);
  let qs = qs_params;
  //const tweet_data = [];
  let result_count = 0;
  while (result_count < 10000) {
    console.log(qs);
    const tweets = await (await fetch(`https://api.twitter.com/2/tweets/search/recent?${qs}`, {
      headers: {
        'authorization': `Bearer ${process.env.TW_BEARER_TOKEN}`
      }
    })).json();

    if(tweets.meta.result_count == 0){
      break;
    }

    for(const tweet of tweets.data){
      insertStmt.run({id:tweet.id,tweet:JSON.stringify(tweet),conversation_id:tweet.conversation_id});
    }

    qs = `${qs_params}&next_token=${tweets.meta.next_token}`;
    result_count += tweets.meta.result_count;
    console.log(result_count);
    //tweet_data.push(...tweets.data);
  }

  db.close();

  //await fs.promises.writeFile('../data/tweets-v2.json', JSON.stringify(tweet_data, null, 1), 'utf-8');
})();

