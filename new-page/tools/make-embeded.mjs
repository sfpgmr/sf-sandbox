import request from 'request-promise-native';
import fs from 'fs';

(async()=>{
  const tweets = JSON.parse(await fs.promises.readFile('./data/tweets.json'));
  for(const tweet of tweets){
    const data = await request.get({url:`https://publish.twitter.com/oembed`,
      qs:{
        url:`https://twitter.com/sfpgmr/status/${tweet.id_str}`,
        maxwidth:400,
        align:'center',
        hide_thread:false,
        omit_script:true,
        lang:"ja",
        dnt:true
      },
      json:true
    });
    tweet.embed = data;
  }
  await fs.promises.writeFile('./data/tweet2.json',JSON.stringify(tweets,null,1),'utf8');
})();

