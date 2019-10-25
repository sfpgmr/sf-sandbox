import Twitter from 'twitter';
import fs from 'fs';

const client = new Twitter({
    consumer_key: process.env.TWCKEY,
    consumer_secret: process.env.TWCSECRET,
    access_token_key: process.env.TWAKEY,
    access_token_secret: process.env.TWASECRET
});
 
const params = {screen_name: 'sfpgmr'};
client.get('statuses/user_timeline', params, function(error, tweets, response) {
    if (!error) {
          fs.writeFileSync('./tweets.json',JSON.stringify(tweets,null,2),'utf8');
    } else {
          console.error(error);
    }
});

