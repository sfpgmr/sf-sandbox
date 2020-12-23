import jsonld from 'jsonld';
import {context} from '../src/config/context.mjs';
import {config} from '../src/config/site-config.mjs';

const expand = await jsonld.expand(config);
const compact = await jsonld.compact(expand,context);
console.log(JSON.stringify(compact,null,1));