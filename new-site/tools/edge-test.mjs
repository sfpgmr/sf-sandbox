import edge from 'edge.js';

import {config} from '../src/config/site-config.mjs';
import path from 'path';
import url from 'url';
import fs from 'fs';

const baseDir =  path.dirname(url.fileURLToPath(import.meta.url));
edge.registerViews(path.normalize(path.join(baseDir,'../src/views')));

const data = {
  username: 'virk'
};

const context = config['@context'];
const pageSrc = await fs.promises.readFile('../src/views/top.edge','utf-8');
edge.share({context});
const outputHtml = edge.renderString(pageSrc, config);
console.log(outputHtml);
