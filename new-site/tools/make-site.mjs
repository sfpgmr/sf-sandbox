/************************************************* 
  静的サイトジェネレータ
  1. 独自仕様の.mdファイルをHTML化し、ホームページレポジトリに格納する
  2. コンテンツディレクトリの更新部分を抽出し、ホームページディレクトリに格納する
*************************************************/

// syntax highliter
// https://highlightjs.org/
import hljs from 'highlight.js';

// mark down parser 
// https://github.com/chjj/marked を若干改造
import marked from './marked.mjs';

// html template engine
// https://github.com/mde/ejs
import ejs from 'ejs';
import {URL} from 'url';
import path from 'path';

// カレント作業ディレクトリを強制
process.chdir(path.resolve(path.dirname(new URL(import.meta.url).pathname),'../'));

// fs-extra adds file system methods that aren't included 
// in the native fs module and adds promise support to the fs methods.
// It should be a drop in replacement for fs.
// https://github.com/jprichardson/node-fs-extra
import fs from 'fs-extra';

// blog 設定ファイル
import siteConfig from './site-config.mjs';

const config = siteConfig['json-ld'];
const website = JSON.parse(fs.readFileSync(siteConfig.websitePath,'utf8'));
config.WebSite = website;

import crypto from 'crypto';
import util from 'util';

// sitemap
// https://github.com/ekalinin/sitemap.js
import sm from 'sitemap';

// RSS feed generator
// https://github.com/jpmonette/feed
import Feed from 'feed';
import uuid from 'uuid';

// marked用カスタムレンダラ
import {NormalRenderer,AmpRenderer,saveCache} from './sf-renderer.mjs';

// 通常HTML記事生成テンプレート
const template = ejs.compile(
  fs.readFileSync(siteConfig.srcEjsDir + 'template-blog.ejs', 'utf-8'),
  { filename: siteConfig.srcEjsDir + 'template-blog.ejs', cache: true });

// AMP HTML記事生成テンプレート
const ampTemplate = ejs.compile(
  fs.readFileSync(siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp.ejs', 'utf-8'),
  { filename: siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp.ejs', cache: true });
  
// ユーティリティ
import * as sf_util from './sf-util.mjs';
const {exec,spawn,toISOString,compressGzip} = sf_util;

// icon libraries
import octicons from '@primer/octicons';
import simpleIcons from 'simple-icons';

// markedオプションの設定
marked.setOptions({
  highlight: (code, lang = '') => {
    // syntax highlightの設定

    try {
      let v = hljs.highlight(lang, code).value;
      return v;
    } catch (e) {
      //console.log(e,e.stack);
    }
    return code;
  },
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  renderer:new NormalRenderer()
});

// AMP用 Markdown Parser
const ampParser = new marked.Parser({renderer:new AmpRenderer});
// Markdown Parser
const parser = new marked.Parser({renderer:new NormalRenderer});

// コンテンツを日付降順に並び替える
function docSortFunc(a, b) {
  const ad = new Date(a.blogPosting.datePublished);
  const bd = new Date(b.blogPosting.datePublished);
  if (ad > bd) {
    return -1;
  } else if (ad < bd) {
    return 1;
  }
  return 0;
}

// urlを相対urlに変換する
function toRelative(url) {
  let u = new URL(url);
  if (u.origin.match(new RegExp(siteConfig.siteDomain))) {
    u = url.replace(u.origin, '');
  }
  return u;
}

const mdDir = path.normalize(siteConfig.gitRepoDir + siteConfig.mdDir).replace(/\\/ig, '/');

// description の生成
function makeDescription(content)
{
  return (content
    .replace(/["#]/g,(m)=>`&#${m.codePointAt(0)}`)
    .replace(/<('[^']*'|'[^']*'|[^''>])*>/ig, '')
    .replace(/\[[^\]]*\]/ig, '')
    .replace(/[\u0000-\u001f]/ig, '')
    .substr(0, 200) + '...');
  // .replace(/[\'&\'\/]/g, (d) => {
  //   switch (d) {
  //   case "'":
  //     return "\\'";
  //   case '&':
  //     return '\\u0026';
  //   case "'":
  //     return '\\u0027';
  //   case '/':
  //     return '\\u002f';
  //   }
  // });
}


//// blogPosting情報の更新と.mdファイルのアップデート
async function updateBlogPosting(mdPath,content,blogPosting,postAttr){
  let isContentUpdated = false;

  if (!postAttr.blogPosting.datePublished) {//現在日付を埋め込む
    isContentUpdated = true;
    blogPosting.datePublished = postAttr.blogPosting.datePublished = toISOString();
    blogPosting.dateModified = postAttr.blogPosting.dateModified = blogPosting.datePublished;
  } else {
    isContentUpdated = true;
    blogPosting.dateModified = postAttr.blogPosting.dateModified = toISOString();
  }

  // blogIdがない場合はセットする
  if (!postAttr.blogId) {
    postAttr.blogId = siteConfig.siteUrl + uuid.v4();
  }

  // urlが指定されていない場合
  if (!blogPosting.url && postAttr.blogPosting.datePublished != 'draft') {
    isContentUpdated = true;
    let datePublished = new Date(postAttr.blogPosting.datePublished);
    let yearMonthPath = datePublished.getFullYear() + '/' + ('0' + (datePublished.getMonth() + 1)).slice(-2);
    const shasum = crypto.createHash('md5');
    shasum.update(content);
    let hash = shasum.digest('hex');
    let url = new URL(siteConfig.siteUrl + siteConfig.siteBlogRoot + siteConfig.siteContentPath + yearMonthPath + '/' + hash);
    postAttr.blogPosting.url = blogPosting.url = postAttr.blogPosting.url = url.toString();
    
  } else {
    // 拡張子(.html)を除く
    postAttr.blogPosting.url = blogPosting.url = blogPosting.url.replace(/\.\w*?$/ig,'');
  }

  const contentPath = siteConfig.destEjsDir + (new URL(blogPosting.url)).pathname.replace(/\/blog/i,'');
  //console.log(contentPath);

  if (blogPosting.datePublished != 'draft') {
  //      var {bodyContent,ampBodyContent} = await generateContent(tokens);
  //      postAttr.blogPosting.description = blogPosting.description;
    isContentUpdated = true;
  }

  if (isContentUpdated) {
    let rep = (/<script.*?id=['"]?sfblog['"]?.*?>([\s\S]*?)<\/script>/i).exec(content);
    content = content.replace(rep[1], JSON.stringify(postAttr, null, 1));
    await fs.writeFile(mdPath, content, 'utf-8');
  }

  return contentPath;
}

/** コンテンツの追加 */
async function appendMd(mdPath, entries) {
  let content = await fs.readFile(mdPath, 'utf-8');
  //console.log(`${mdPath}:ファイルを解析`);
  let { tokens, postAttr, blogPosting } = parseContent(content);

  if (blogPosting.datePublished != 'draft') {
    const contentPath = await updateBlogPosting(mdPath,content,blogPosting,postAttr);
    const docAppended = {
      mdPath: mdPath,
      blogPosting: blogPosting,
      blogId: postAttr.blogId,
      contentPath: contentPath,
      tokens:tokens,
      needUpdate: true,
      index: entries.length
    };
    entries.push(docAppended);
    return docAppended;
  }
}

/**コンテンツの更新 */
async function updateMd(mdPath, entries) {

  let content = await fs.readFile(mdPath, 'utf-8');

  let { tokens, postAttr, blogPosting } = parseContent(content);

  if (blogPosting.datePublished != 'draft') {
    const contentPath = await updateBlogPosting(mdPath,content,blogPosting,postAttr);
    const updateDoc = entries.find(d => {
      return d.mdPath == mdPath;
    });
    if (updateDoc) {
      /* 更新 */

      if (updateDoc.contentPath != contentPath
        || (blogPosting.datePublished == 'draft')) {
        let samePath = entries.find(d => d.contentPath == updateDoc.contentPath && d.blogId != updateDoc.blogId);
        if (!samePath || samePath.length == 0) {
          try {
            await fs.unlink(updateDoc.contentPath);
          } catch (e) {
            if (e.code != 'ENOENT') {
              throw e;
            }
          }
        }
      }
      // コンテンツの更新
      updateDoc.blogPosting = blogPosting;
      updateDoc.blogId = postAttr.blogId;
      updateDoc.contentPath = contentPath;
      updateDoc.tokens = tokens;
      updateDoc.needUpdate = true;
      return updateDoc;
    }
  }
}

/**コンテンツの削除 */
async function deleteMd(mdPath, entries) {
  let deleteIndex = 0;
  let deleteDoc = null;
  for(const d of entries){
    if(d.mdPath == mdPath){
      deleteDoc = d;
      break;
    }
    ++deleteIndex;
  }

  if (deleteDoc) {
    let samePath = entries.find(d => d.contentPath == deleteDoc.contentPath && d.blogId != deleteDoc.blogId);
    if (!samePath) {
      try {
        await fs.unlink(deleteDoc.contentPath + '.html');
        await fs.unlink(deleteDoc.contentPath + '.amp.html');
      } catch (e) {
        if (e.code != 'ENOENT') {
          throw e;
        }
      }
    }
    // 要素の削除
    return entries.splice(deleteIndex, 1)[0];
  } 
}

/** リスト生成（日付降順） 
 * 年別にリストを作成する
 * 
*/
async function generateArchive(docs, archiveDate,updatedDocs) {
  //const siteMapUrls = [];

  const years = updatedDocs ?
    updatedDocs.map(doc=>(new Date(doc.blogPosting.datePublished)).getFullYear())
      .filter((x, i, self)=>{return self.indexOf(x) === i;}):void(0);
  // normal
  const listTemplate = ejs.compile(await fs.readFile(siteConfig.srcEjsDir + 'template-blog-list.ejs', 'utf-8'), { filename: siteConfig.srcEjsDir + 'template-blog-list.ejs', cache: true });

  // AMP
  const ampListTemplatePath = siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp-list.ejs';
  const ampListTemplate = ejs.compile(await fs.readFile(ampListTemplatePath, 'utf-8'), { filename: ampListTemplatePath, cache: true });

  // normal
  const listTemplateIndex = ejs.compile(await fs.readFile(siteConfig.srcEjsDir + 'template-blog-archive-index.ejs', 'utf-8'), { filename: siteConfig.srcEjsDir + 'template-blog-archive-index.ejs', cache: true });

  // AMP
  const ampListTemplateIndexPath = siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp-archive-index.ejs';
  const ampListTemplateIndex = ejs.compile(await fs.readFile(ampListTemplateIndexPath, 'utf-8'), { filename: ampListTemplateIndexPath, cache: true });

  
  // 年毎のアーカイブメニュー用データ作成
  let articlesPerYear = new Map();
  for (const doc of docs) {
    let y = (new Date(doc.blogPosting.datePublished)).getFullYear();
    if (articlesPerYear.has(y)) {
      const d = articlesPerYear.get(y);
      d.count += 1;
      d.blogPosts.push(doc.blogPosting);
      //       articlesPerYear.set(y,articlesPerYear.get(y) + 1);
    } else {
      articlesPerYear.set(y, {
        count: 1,
        blogPosts: new Array(doc.blogPosting)
      });
    }
  }

  let blogPosting = Object.assign(
    {
      'datePublished': archiveDate,
      'dateModified': archiveDate
    },
    config['sf:siteConfig']['sf:blogPostingDefaults']);
  const archiveIndex = [];

  let first = false;
  // 年毎のアーカイブリストを作成
  for (const [year, d] of articlesPerYear) {
    const basePath = siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot */+ siteConfig.archiveDir;
    const path = basePath + year;

    let nextURL = null, prevURL = null;
    if (articlesPerYear.has(year - 1)) {
      nextURL = '/' + siteConfig.siteBlogRoot + siteConfig.archiveDir + (year - 1);
    }
    if (articlesPerYear.has(year + 1)) {
      prevURL = '/' + siteConfig.siteBlogRoot + siteConfig.archiveDir + (year + 1);
    }
    
    const blogPostingUrl = siteConfig.siteUrl + siteConfig.siteBlogRoot + siteConfig.archiveDir + year;
    blogPosting = Object.assign(blogPosting, {
      '@id': blogPostingUrl,
      'keywords': config['sf:siteConfig'].Blog.keywords,
      'about': `${year}年のアーカイブ`,
      'description': `${year}年のアーカイブ`,
      'headline': `${year}年のアーカイブ`,
      'url': blogPostingUrl
    });

    archiveIndex.push(Object.assign({},blogPosting));

    if(!years || (years.indexOf(year) != -1)){
        
      await fs.outputFile(
        path + '.html', 
        listTemplate({ params: { blogPosts: d.blogPosts, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: nextURL, prevURL: prevURL } }), 'utf-8');
  
      await fs.outputFile(
        path + '.amp.html', 
        ampListTemplate({ params: { blogPosts: d.blogPosts, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: nextURL, prevURL: prevURL} }), 'utf-8');
    
      // sitemap用データ
      // normal
      // siteMapUrls.push({
      //   url: blogPosting.url + '.html',
      //   changefreq: 'daily',
      //   priority: 0.6,
      //   lastmodISO: archiveDate
      // });
  
      if (!first) {
        first = true;
        // トップページのレンダリング
        // normal
        blogPosting['@id'] = blogPosting['url'] = siteConfig.siteUrl + siteConfig.siteBlogRoot + 'index';
        blogPosting.headline = config['sf:siteConfig'].Blog.headline;
        blogPosting.description = config['sf:siteConfig'].Blog.about;
        blogPosting.keywords = config['sf:siteConfig'].Blog.keywords;
  
  
        await fs.outputFile(siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + 'index.html', listTemplate({ params: { blogPosts: d.blogPosts, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: nextURL, prevURL: prevURL,toppage:true } }), 'utf-8');
  
        // AMP
        await fs.outputFile(siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + 'index.amp.html', ampListTemplate({ params: { blogPosts: d.blogPosts, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: nextURL, prevURL: prevURL,toppage:true } }), 'utf-8');
        // sitemap用データ
        // siteMapUrls.push({
        //   url: siteConfig.siteUrl + siteConfig.siteBlogRoot + 'index.html',
        //   changefreq: 'daily',
        //   priority: 0.6,
        //   lastmodISO: archiveDate
        // });
        // siteMapUrls.push({
        //   url: blogPosting.url,
        //   changefreq: 'daily',
        //   priority: 0.6,
        //   lastmodISO: archiveDate
        // });
      }

    } else if (!first) {
      first = true;
    }
  }

  // archiveのインデックスファイルを生成する
  
  // normal
  const blogPostingUrl = siteConfig.siteUrl /*+ siteConfig.siteBlogRoot*/ + siteConfig.archiveDir + 'index';
 
  blogPosting = Object.assign(blogPosting, {
    '@id': blogPostingUrl,
    'keywords': config['sf:siteConfig'].Blog.keywords,
    'about': '年毎のアーカイブ',
    'description': '年毎のアーカイブ',
    'headline': '年毎のアーカイブ',
    'url': blogPostingUrl
  });

  await fs.outputFile(siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + siteConfig.archiveDir + 'index.html', listTemplateIndex({ params: { blogPosts: archiveIndex, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: null, prevURL: null } }), 'utf-8');

  // AMP
  await fs.outputFile(siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + siteConfig.archiveDir + 'index.amp.html', ampListTemplateIndex({ params: { blogPosts: archiveIndex, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: null, prevURL: null } }), 'utf-8');

  // // sitemap用データ
  // siteMapUrls.push({
  //   url: blogPostingUrl,
  //   changefreq: 'daily',
  //   priority: 0.6,
  //   lastmodISO: archiveDate
  // });

  // siteMapUrls.push({
  //   url: blogPosting.url,
  //   changefreq: 'daily',
  //   priority: 0.6,
  //   lastmodISO: archiveDate
  // });

  //return siteMapUrls;
}

/** リスト生成（キーワード順）
 * キーワードごとにリストを作成する
 */
async function generateKeywords(docs, archiveDate,updatedDocs) {
  
  //const siteMapUrls = [];// サイトマップ用URL

  const listTemplate = ejs.compile(await fs.readFile(siteConfig.srcEjsDir + 'template-blog-list.ejs', 'utf-8'), { filename: siteConfig.srcEjsDir + 'template-blog-list.ejs', cache: true });

  const ampListTemplate =  ejs.compile(await fs.readFile(siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp-list.ejs', 'utf-8'), { filename: siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp-list.ejs', cache: true });

  const archiveTemplate = ejs.compile(await fs.readFile(siteConfig.srcEjsDir + 'template-blog-archive-category2.ejs', 'utf-8'), { filename: siteConfig.srcEjsDir + 'template-blog-archive-category2.ejs', cache: true });

  const ampArchiveTemplate = ejs.compile(await fs.readFile(siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp-archive-category2.ejs', 'utf-8'), { filename: siteConfig.srcEjsDir + siteConfig.ampDir + 'template-blog-amp-archive-category2.ejs', cache: true });

  let updatedKeywords = void(0);
  if(updatedDocs){
    updatedKeywords = [];
    updatedDocs.forEach(doc=>{
      updatedKeywords.push(...doc.blogPosting.keywords.split(',').filter(d => d.length > 0).map(d => d.trim()));
    });
    updatedKeywords = updatedKeywords.filter((x, i, self)=>{return self.indexOf(x) === i;});
  }


  // キーワード毎のアーカイブメニュー用データ作成
  let docsPerKeyword = new Map();
  for (const doc of docs) {
    let keywords = doc.blogPosting.keywords.split(',').filter(d => d.length > 0).map(d => d.trim());
    for (const keyword of keywords) {
      if (docsPerKeyword.has(keyword)) {
        const d = docsPerKeyword.get(keyword);
        d.count += 1;
        d.blogPosts.push(doc.blogPosting);
      } else {
        docsPerKeyword.set(keyword, {
          count: 1,
          blogPosts: new Array(doc.blogPosting)
        });
      }
    }
  }

  let blogPosting = Object.assign(
    {
      'datePublished': archiveDate,
      'dateModified': archiveDate
    },
    config['sf:siteConfig']['sf:blogPostingDefaults']);

  let prevKeyword = null;
  const itNext = docsPerKeyword.entries();
  let keywords = [];
  for (const [keyword, d] of docsPerKeyword) {
    const encodedKeyword = encodeURIComponent(keyword);
    const path = siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + siteConfig.archiveCategoryDir + encodedKeyword;
    let nextURL = null, prevURL = null;
    let { value, done } = itNext.next();
    if (!done) {
      nextURL = '/' + siteConfig.siteBlogRoot + siteConfig.archiveCategoryDir + encodeURIComponent(value[0]);
    }

    if (prevKeyword) {
      prevURL = '/' + siteConfig.siteBlogRoot + siteConfig.archiveCategoryDir + prevKeyword;
    }


    const blogPostingUrl = siteConfig.siteUrl + siteConfig.siteBlogRoot + siteConfig.archiveCategoryDir + encodedKeyword;
    blogPosting = Object.assign(blogPosting, {
      'keywords': keyword,
      'about': `キーワード「${keyword}」 のアーカイブ`,
      'description': `キーワード「${keyword}」 のアーカイブ`,
      'headline': `キーワード「${keyword}」 のアーカイブ`,
      '@id': blogPostingUrl + '.html',
      'url': blogPostingUrl
    });

    if(!updatedKeywords || (updatedKeywords.indexOf(keyword) != -1)){
      // normal HTML 
      await fs.outputFile(path + '.html', listTemplate({ params: { blogPosts: d.blogPosts, siteConfig: siteConfig, URL: URL, config: config, keyword: keyword, blogPosting: blogPosting, nextURL: nextURL, prevURL: prevURL} }), 'utf-8');
      prevKeyword = encodedKeyword;

      // AMP HTML
      blogPosting['@id'] = blogPostingUrl + '.amp.html';
      blogPosting.url = blogPostingUrl + '.amp';
      await fs.outputFile(path + '.amp.html', ampListTemplate({ params: { blogPosts: d.blogPosts, siteConfig: siteConfig, URL: URL, config: config, keyword: keyword, blogPosting: blogPosting, nextURL: nextURL, prevURL: prevURL } }), 'utf-8');
    }
    
    keywords.push({
      text: keyword,
      size: 15 + d.count,
      url: '/' + siteConfig.siteBlogRoot + siteConfig.archiveCategoryDir + encodedKeyword
    });
    // // sitemap用データ
    // siteMapUrls.push({
    //   url: blogPostingUrl + '.html',
    //   changefreq: 'daily',
    //   priority: 0.5,
    //   lastmodISO: archiveDate
    // });
    // siteMapUrls.push({
    //   url: blogPostingUrl + '.amp.html',
    //   changefreq: 'daily',
    //   priority: 0.5,
    //   lastmodISO: archiveDate
    // });
  }

  const archiveBlogPostingUrl = siteConfig.siteUrl + siteConfig.siteBlogRoot + siteConfig.archiveCategoryDir;
  blogPosting = Object.assign(blogPosting, {
    '@id': archiveBlogPostingUrl + 'index.html',
    'keywords': config['sf:siteConfig'].Blog.keywords,
    'about': 'カテゴリ毎のアーカイブ',
    'description': 'カテゴリ毎のアーカイブ',
    'headline': 'カテゴリ毎のアーカイブ',
    'url': archiveBlogPostingUrl + 'index'
  });

  keywords = keywords.sort((a, b) => {
    if (a.text.codePointAt(0) < b.text.codePointAt(0)) {
      return -1;
    } else if (a.text.codePointAt(0) > b.text.codePointAt(0)) {
      return 1;
    }
    return 0;
  });

  // normal
  const archiveTemplateUrl = siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + siteConfig.archiveCategoryDir;
  await fs.outputFile(archiveTemplateUrl + 'index.html', archiveTemplate({ params: { keywords: keywords, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: null, prevURL: null } }), 'utf-8');

  // AMP
  blogPosting['@id'] = archiveBlogPostingUrl + 'index.amp.html';
  blogPosting.url = archiveBlogPostingUrl + 'index.amp';
  await fs.outputFile(archiveTemplateUrl + 'index.amp.html', ampArchiveTemplate({ params: { keywords: keywords, siteConfig: siteConfig, URL: URL, config: config, blogPosting: blogPosting, nextURL: null, prevURL: null } }), 'utf-8');

  // // sitemap用データ
  // // normal
  // siteMapUrls.push({
  //   url: archiveBlogPostingUrl + 'index.html',
  //   changefreq: 'daily',
  //   priority: 0.6,
  //   lastmodISO: archiveDate
  // });

  // // AMP
  // siteMapUrls.push({
  //   url: blogPosting.url,
  //   changefreq: 'daily',
  //   priority: 0.6,
  //   lastmodISO: archiveDate
  // });
  // return siteMapUrls;
}

// サイトマップの生成
async function generateSiteMap(docs, urls) {
  const sitemap = sm.createSitemap({
    cacheTime: 600000,
    urls: urls
  });

  for (const doc of docs) {
    sitemap.add(
      {
        url: doc.blogPosting.url + '.html',
        changefreq: 'weekly',
        priority: 0.6,
        lastmodISO: doc.blogPosting.dateModified
      }
    );
    sitemap.add(
      {
        url: doc.blogPosting.url + '.amp.html',
        changefreq: 'weekly',
        priority: 0.6,
        lastmodISO: doc.blogPosting.dateModified
      }
    );
  }
  const outPath = siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + 'sitemap.xml';
  await fs.outputFile(outPath, sitemap.toString(), 'utf-8');
  await compressGzip(outPath);

  // sitemap index 
  const sitemapIndex = sm.buildSitemapIndex({
    urls: [
      siteConfig.siteUrl + siteConfig.siteBlogRoot + 'sitemap.xml.gz',
      siteConfig.siteUrl + 'sitemap-root.xml',
      siteConfig.siteUrl + 'sitemap-web.xml'
    ]
  });
  const outPathSmi = siteConfig.wwwRootDir + 'sitemap.xml';
  await fs.outputFile(outPathSmi, sitemapIndex.toString(), 'utf-8');
  await compressGzip(outPathSmi);
}

// ATOM Feedの生成
async function generateAtom(docs) {
  const blog = config['sf:siteConfig'].Blog;
  const feed = new Feed({
    title: blog.headline,
    description: blog.about,
    id: blog.url,
    link: blog.url,
    // image: blog.image.url,
    // favicon: 'http://example.com/favicon.ico',
    copyright: config['sf:siteConfig']['sf:copylight'],
    updated: new Date(), // optional, default = today 
    feedLinks: {
      atom: blog.url + '/feed',
    },
    author: {
      name: blog.author.name,
      link: blog.author['@id'],
    }
  });
  for (let i = 0, e = Math.min(docs.length, 100); i < e; ++i) {
    const doc = docs[i];
    const bp = doc.blogPosting;
    feed.addItem({
      title: bp.headline,
      id: doc.blogId,
      link: bp.url + '.html',
      description: bp.description,
      author: [
        {
          name: siteConfig.author,
          link: siteConfig.authorLink
        }
      ],
      date: new Date(bp.datePublished)
    });
  }

  await fs.outputFile(siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + 'feed.xml', feed.atom1(), 'utf-8');
}

/**コンテンツのパース */
function parseContent(content) {
  // markdown -> html 変換
  let tokens = marked.lexer(content);
  let blogPosting = {};
  //console.log(tokens);
  // タイトルの取り出し
  let headline = '';
  let postAttr;

  if (tokens[0].type == 'heading') {
    headline = tokens[0].text;
    tokens.shift();
  }
  // 属性の取り出し
  if (tokens[0].type == 'html' || tokens[0].type == 'paragraph') {
    let attr = (/<script\s+.*?id=['"]?sfblog['"]?.*?>([\s\S]*?)<\/script>/ig).exec(tokens[0].text);
    //console.log(attr[1]);
    if (attr && attr[1]) {
      postAttr = JSON.parse(attr[1]);
      let t = Object.assign({}, config['sf:siteConfig']['sf:blogPostingDefaults']);
      blogPosting = Object.assign(t, postAttr.blogPosting);
      if (tokens[0].type == 'html') {
        tokens.shift();
      } else {
        tokens[0].text = tokens[0].text.replace(attr[0], '');
      }
      blogPosting.headline = headline;
      // // 最終的なHTMLにインクルードするスクリプトの検出
      // tokens.forEach(t=>{
      //   if(t.type == 'twitter'){
      //     blogPosting["sf:custom"] = {twitter:true};
      //   }
      // });
    }
  } else {
    throw new Error('.mdファイル解析エラー:属性情報が含まれていません。');
  }

  return {
    tokens: tokens,
    postAttr: postAttr,
    blogPosting: blogPosting
  };
}

/**コンテンツの更新 */
export async function update() {

  // JSONファイルのオープン
  try {
    var entries = JSON.parse(await fs.readFile(siteConfig.entriesPath, 'utf-8'));
  } catch (e) {
    if (e.code == 'ENOENT') {
      return create();
    } else {
      throw e;
    }
  }

  for (let i = 0, e = entries.length; i < e; ++i) {
    entries[i].needUpdate = false;
    entries[i].index = i;
  }

  // git -add
  let mdRepoDir = path.resolve(siteConfig.mdRepoDir);
  const opt = {cwd:mdRepoDir};
  await exec(`git -C ${mdRepoDir} fetch --quiet`,);
  await spawn('git', ['-C',mdRepoDir,'add', '--all'],opt);

  // 差分情報の抽出
  let o = await spawn('git', ['-C',mdRepoDir,'--no-pager', 'diff', 'HEAD', '-C','-M','--name-status', '--relative=' + siteConfig.repoMdDir],opt);
  // git config --global core.quotepath false ==> 日本語の\xxxエスケープ を禁止しないとファイルが読めない

  let files = o.out.split(/\n/g)
    .map(d => d.split(/\t/g))
    .filter(d => d[0] != '');

  let updatedDocs = [];
  for (const d of files) {
    d[1] = siteConfig.mdDir + d[1].replace(/^'(.*?)'$/, '$1') || d[1];
    console.log(d[0], d[1]);
    switch (d[0]) {
    /* 追加 */
    case 'A':
      {
        const doc = await appendMd(d[1], entries);
        doc && updatedDocs.push(doc);
      }
      break;
    /* 更新 */
    case 'M':
      {
        let doc = await updateMd(d[1], entries);
        if(!doc){
          doc = await appendMd(d[1],entries);
        } 
        doc && updatedDocs.push(doc);
      }
      break;
    /* 削除 */
    case 'D':
      {
        const doc = await deleteMd(d[1], entries);
        doc && updatedDocs.push(doc);
      }
      break;
    }
  }

  entries.sort(docSortFunc);
  // 変更部分の検出
  for (let i = 0, e = entries.length, prev = 0; i < e; ++i) {
    const doc = entries[i];
    if (doc.index != i && (doc.index - prev != 1)) {
      doc.needUpdate = true;
      if (i != 0) {
        entries[i - 1].needUpdate = true;
      }
    }
    prev = doc.index;
  }

  for (let i = 0, e = entries.length; i < e; ++i) {
    const doc = entries[i];
    if(!doc.tokens.links){
      doc.tokens.links = {};
    }
    if (doc.needUpdate) {
      const prevURL = i == 0 ? null : toRelative(entries[i - 1].blogPosting.url);
      const nextURL = i == (e - 1) ? null : toRelative(entries[i + 1].blogPosting.url);
      let content,ampContent;
      try {
        content = await parser.parse(doc.tokens); 
      } catch (e) {
        const m = `${doc.mdPath} でエラー ${e.message} が発生しました。`;
        console.warn(m,e);
        content = m + '\n' + e.stack;
      }
      doc.blogPosting.description = makeDescription(content);
      try {
        ampContent = await ampParser.parse(doc.tokens); 
      } catch (e) {
        const m = `${doc.mdPath} でエラー ${e.message} が発生しました。`;
        console.warn(m,e);
        ampContent = m + '\n' + e.stack;
      }
      await fs.outputFile(doc.contentPath + '.html',
        template({
          params: {
            content: content,
            blogPosting: doc.blogPosting,
            siteConfig: siteConfig,
            config: config,
            URL: URL,
            prevURL: prevURL,
            nextURL: nextURL
          }
        }),
         'utf-8');
      await fs.outputFile(doc.contentPath + '.amp.html',
        ampTemplate({
          params: {
            content: ampContent,
            blogPosting: doc.blogPosting,
            siteConfig: siteConfig,
            config: config,
            URL: URL,
            prevURL: prevURL,
            nextURL: nextURL
          }
        })
        , 'utf-8');
    }
  }

  if (files.length > 0) {
    const archiveDate = toISOString();
    await generateArchive(entries, archiveDate,updatedDocs);
    await generateAtom(entries, archiveDate);
    await generateKeywords(entries, archiveDate,updatedDocs);
    await generateSiteMap(entries, [], archiveDate);
    await fs.writeFile(siteConfig.entriesPath, JSON.stringify(entries), 'utf-8');
    if(siteConfig.pushAutomatic){
      try {
  
        const optDest = {/*cwd:siteConfig.destRepoDir*/};
        const destRepoDir = path.resolve(siteConfig.destRepoDir);
        await spawn('git', ['-C',destRepoDir,'add', '--all'],optDest);
        await exec(`git --no-pager -C ${destRepoDir} commit -m "create content" --quiet`,optDest);
        await exec(`git --no-pager -C ${destRepoDir} push -f --quiet`,optDest);
  
        await exec(`git -C ${destRepoDir} gc --quiet`,optDest);
        await exec(`git -C ${destRepoDir} prune`,optDest);
        
        const opt = {/*cwd:siteConfig.mdRepoDir*/};
        const mdRepoDir = path.resolve(siteConfig.mdRepoDir);
        await spawn('git', ['-C',mdRepoDir,'add', '--all'],opt);
        await exec(`git --no-pager -C ${mdRepoDir} commit -m "update content" --quiet`,opt);
        await exec(`git --no-pager -C ${mdRepoDir} push -f --quiet`,opt);
    
      } catch (e) {
        console.error(e.stdout || e);
      }
    }
  }
  //await fs.writeFile('./amazon-cache.json',JSON.stringify([...amazonCache]),'utf-8');
  await saveCache();
}

/**初期設定 */
export async function create() {
  // すでに初期設定されているかのチェック
  try {
    let dbstat = await fs.stat(siteConfig.entriesPath);
    if (dbstat.isFile()) {
      console.warn('すでに初期設定済みです。');
      return;
    } else {
      throw new Error('管理用DBが不正です。');
    }
  } catch (e) {
    if (e.code != 'ENOENT') {
      // ファイルがない以外のエラーはスローする。
      throw e;
    }
  }

  // ファイル一覧を作成
  let filePaths = [];
  function listFile(mdDir) {
    // .mdディレクトリを再帰的に検索する
    let dirs = fs.readdirSync(mdDir);
    dirs.forEach((d) => {
      let mdPath = mdDir + d;
      let stats = fs.statSync(mdPath);
      if (stats.isDirectory()) {
        listFile(mdPath + '/');
      } else if (stats.isFile() && d.match(/\.md$/)) {
        filePaths.push(mdPath);
      }
    });
  }

  listFile(siteConfig.mdDir);

  let entries = [];
  for (let d of filePaths) {
    await appendMd(d, entries);
  }

  ////////////////////////////
  ///// HTMLファイルの生成 ////
  ////////////////////////////

  entries.sort(docSortFunc);
  // アーカイブの生成
  let archiveDate = toISOString();
  await generateArchive(entries, archiveDate);
  await generateKeywords(entries, archiveDate);
  // サイトマップの生成
  let urls = [];
  await generateSiteMap(entries, urls, archiveDate);
  // Atom Feedの生成
  await generateAtom(entries);

  for (let i = 
    0, e = entries.length; i < e; ++i) {
    const doc = entries[i];
    console.log(`${doc.mdPath}を処理中`);
    doc.index = i;
    console.log('output:' + doc.contentPath);
    const prevURL = i == 0 ? null : toRelative(entries[i - 1].blogPosting.url);
    const nextURL = i == (e - 1) ? null : toRelative(entries[i + 1].blogPosting.url);
    // content 
    let content,ampContent;
    try {
      content = await parser.parse(doc.tokens); 
    } catch (e) {
      const m = `${doc.mdPath} でエラー ${e.message} が発生しました。`;
      console.warn(m,e);
      content = m + '\n' + e.stack;
    }
    doc.blogPosting.description = makeDescription(content);
    try {
      ampContent = await ampParser.parse(doc.tokens); 
    } catch (e) {
      const m = `${doc.mdPath} でエラー ${e.message} が発生しました。`;
      console.warn(m,e);
      ampContent = m + '\n' + e.stack;
    }
    
    console.log('parse完了');

    // normal HTML
    await fs.outputFile(doc.contentPath + '.html',
      template({
        params: {
          content: content,
          blogPosting: doc.blogPosting,
          siteConfig: siteConfig,
          config: config,
          URL: URL,
          prevURL: prevURL,
          nextURL: nextURL
        }
      })
      , 'utf-8');
    await fs.outputFile(doc.contentPath + '.amp.html',
      ampTemplate({
        params: {
          content: ampContent,
          blogPosting: doc.blogPosting,
          siteConfig: siteConfig,
          config: config,
          URL: URL,
          prevURL: prevURL,
          nextURL: nextURL
        }
      })
      , 'utf-8');  
      console.log('出力完了:' + doc.contentPath);
  }

  //await db.entries.insert(docs);

  await fs.writeFile(siteConfig.entriesPath, JSON.stringify(entries), 'utf-8');

  //console.log(docs.length);
  if(siteConfig.pushAutomatic){
    try {

      const optDest = {/*cwd:siteConfig.destRepoDir*/};
      const destRepoDir = path.resolve(siteConfig.destRepoDir);
      await spawn('git', ['-C',destRepoDir,'add', '--all'],optDest);
      await exec(`git --no-pager -C ${destRepoDir} commit -m "create content" --quiet`,optDest);
      await exec(`git --no-pager -C ${destRepoDir} push -f --quiet`,optDest);

      await exec(`git -C ${destRepoDir} gc --quiet`,optDest);
      await exec(`git -C ${destRepoDir} prune`,optDest);
      
      const opt = {/*cwd:siteConfig.mdRepoDir*/};
      let mdPath = path.resolve(siteConfig.mdRepoDir);
      await spawn('git', ['-C',mdPath,'add', '--all'],opt);
      await exec(`git --no-pager -C ${mdPath} commit -m "update content" --quiet`,opt);
      await exec(`git --no-pager -C ${mdPath} push -f --quiet`,opt);
  
    } catch (e) {
      console.error(e.stdout || e);
    }
  }
  await saveCache();
  //await fs.writeFile('./amazon-cache.json',JSON.stringify([...amazonCache]),'utf-8');
}

/**再構築 */
export async function reset() {
  // entries dbの削除
  try {
    await fs.unlink(siteConfig.entriesPath);
    // await fs.unlink(siteConfig.keywordsPath);
  } catch (e) {
    if (e.code != 'ENOENT') {
      throw e;
    }
  }
  // コンテンツディレクトリの内容を削除
  await fs.remove(path.normalize(siteConfig.destEjsDir + siteConfig.siteContentPath));
  await fs.remove(path.normalize(siteConfig.destEjsDir /*+ siteConfig.siteBlogRoot*/ + siteConfig.archiveDir));
  // 再構築
  return create();
}

//update().catch(e => console.log(e, e.stack));

// module.exports = {
//   create: create,
//   update: update,
//   reset: reset
// };

