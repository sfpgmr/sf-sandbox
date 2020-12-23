'use strict';

import fs from 'fs-extra';
import util from 'util';
import {exec as exec_} from 'child_process';
import {spawn as spawn_} from 'child_process';
import zlib from 'zlib';

export const exec = util.promisify(exec_);

export function compressGzip(path) {
  // gzipファイルを作成する
  return new Promise((resolve, reject) => {
    var out = fs.createWriteStream(path + '.gz');
    out.on('finish', resolve.bind(null));

    fs.createReadStream(path)
      .pipe(zlib.createGzip({ level: zlib.Z_BEST_COMPRESSION }))
      .pipe(out);
    out = void (0);
  });
}


export function spawn(command, args, options) {
  return new Promise((resolve, reject) => {
    let out = '';
    let errOut = '';
    let s = spawn_(command, args, options);
    s.stdout.on('data', data => {
      out += data;
    });
    s.stderr.on('data', err => {
      errOut += err;
      //console.log('message:',err.toString());
      //reject(new Error(err));
    });
    s.on('close', () => {
      resolve({out:out, err:errOut});
    });
  });
}

// DateをISO8601形式文字列に変換する
// String.toISOString()はタイムゾーンがZとなってしまうので。。
function pad(n) {
  return ('0' + n).slice(-2);
}

export function toISOString(d = new Date()) {
  const timezoneOffset = d.getTimezoneOffset();
  const hour = Math.abs(timezoneOffset / 60) | 0;
  const minutes = Math.abs(timezoneOffset % 60);
  let tzstr = 'Z';
  if (timezoneOffset < 0) {
    tzstr = `+${pad(hour)}:${pad(minutes)}`;
  } else if (timezoneOffset > 0) {
    tzstr = `-${pad(hour)}:${pad(minutes)}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tzstr}`;
}

// ISO8601形式かどうかをチェックする正規表現
var ISO8601Format = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)$/;


export function parseAttributes(attrbStr){
  let p = attrbStr.trim().split(/\s/g);
  let attribs = {};
  for(let i = 0,e = p.length;i < e;++i){
    let att = p[i];
    let pos = att.indexOf('=');
    if(pos == -1){
      attribs[att] = att;
      continue; 
    } 

    let attrib = [att.substr(0,pos),att.substr(pos+1)];
    
    attrib[0] = attrib[0].trim().toLowerCase();
    attrib[1] = (attrib[1] && attrib[1].trim().replace(/^['"]?([^`"]*)['"]?$/,'$1')) || '';
    if(attrib[0].length > 0){
      attribs[attrib[0]] = attrib[1];
    }
  }
  return attribs;
}
