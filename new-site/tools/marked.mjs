/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */
'use strict';

/**
 * Block-Level Grammar
 */

const block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def|tex))+)\n*/,
  text: /^[^\n]+/,
  //  tex:/^(?:\$\$\r?\n([\s\S]*?)\$\$)|^(?:\[tex:([\s\S]*?)\])/
  tex: /^\\TeX\r?\n([\s\S]*?)\\TeX/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ('tex', block.tex)
  ();

/**
 * Normal Block Grammar
 */

block.normal = Object.assign({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = Object.assign({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')();

/**
 * GFM + Tables Block Grammar
 */

block.tables = Object.assign({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

export class Lexer {
  constructor(options) {
    this.tokens = [];
    this.tokens.links = {};
    this.options = options || marked.defaults;
    this.rules = block.normal;
    if (this.options.gfm) {
      if (this.options.tables) {
        this.rules = block.tables;
      } else {
        this.rules = block.gfm;
      }
    }
  }

  /**
   * Preprocessing
   */
  lex(src) {
    src = src
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/\u00a0/g, ' ')
      .replace(/\u2424/g, '\n');

    return this.token(src, true);
  }

  /**
   * Lexing
   */

  token(src, top, bq) {
    src = src.replace(/^ +$/gm, '');
    let next
      , loose
      , cap
      , bull
      , b
      , item
      , space
      , i
      , l;

    while (src) {
      // newline
      if (cap = this.rules.newline.exec(src)) {
        src = src.substring(cap[0].length);
        if (cap[0].length > 1) {
          this.tokens.push({
            type: 'space'
          });
        }
      }

      // code
      if (cap = this.rules.code.exec(src)) {
        src = src.substring(cap[0].length);
        cap = cap[0].replace(/^ {4}/gm, '');
        this.tokens.push({
          type: 'code',
          text: !this.options.pedantic
            ? cap.replace(/\n+$/, '')
            : cap
        });
        continue;
      }

      // fences (gfm)
      if (cap = this.rules.fences.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'code',
          lang: cap[2],
          text: cap[3] || ''
        });
        continue;
      }

      // heading
      if (cap = this.rules.heading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'heading',
          depth: cap[1].length,
          text: cap[2]
        });
        continue;
      }


      // table no leading pipe (gfm)
      if (top && (cap = this.rules.nptable.exec(src))) {
        src = src.substring(cap[0].length);

        item = {
          type: 'table',
          header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3].replace(/\n$/, '').split('\n')
        };

        for (i = 0; i < item.align.length; i++) {
          if (/^ *-+: *$/.test(item.align[i])) {
            item.align[i] = 'right';
          } else if (/^ *:-+: *$/.test(item.align[i])) {
            item.align[i] = 'center';
          } else if (/^ *:-+ *$/.test(item.align[i])) {
            item.align[i] = 'left';
          } else {
            item.align[i] = null;
          }
        }

        for (i = 0; i < item.cells.length; i++) {
          item.cells[i] = item.cells[i].split(/ *\| */);
        }

        this.tokens.push(item);

        continue;
      }

      // lheading
      if (cap = this.rules.lheading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'heading',
          depth: cap[2] === '=' ? 1 : 2,
          text: cap[1]
        });
        continue;
      }

      // hr
      if (cap = this.rules.hr.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'hr'
        });
        continue;
      }

      // blockquote
      if (cap = this.rules.blockquote.exec(src)) {
        src = src.substring(cap[0].length);

        this.tokens.push({
          type: 'blockquote_start'
        });

        cap = cap[0].replace(/^ *> ?/gm, '');

        // Pass `top` to keep the current
        // "toplevel" state. This is exactly
        // how markdown.pl works.
        this.token(cap, top, true);

        this.tokens.push({
          type: 'blockquote_end'
        });

        continue;
      }

      // list
      if (cap = this.rules.list.exec(src)) {
        src = src.substring(cap[0].length);
        bull = cap[2];

        this.tokens.push({
          type: 'list_start',
          ordered: bull.length > 1
        });

        // Get each top-level item.
        cap = cap[0].match(this.rules.item);

        next = false;
        l = cap.length;
        i = 0;

        for (; i < l; i++) {
          item = cap[i];

          // Remove the list item's bullet
          // so it is seen as the next token.
          space = item.length;
          item = item.replace(/^ *([*+-]|\d+\.) +/, '');

          // Outdent whatever the
          // list item contains. Hacky.
          if (~item.indexOf('\n ')) {
            space -= item.length;
            item = !this.options.pedantic
              ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
              : item.replace(/^ {1,4}/gm, '');
          }

          // Determine whether the next list item belongs here.
          // Backpedal if it does not belong in this list.
          if (this.options.smartLists && i !== l - 1) {
            b = block.bullet.exec(cap[i + 1])[0];
            if (bull !== b && !(bull.length > 1 && b.length > 1)) {
              src = cap.slice(i + 1).join('\n') + src;
              i = l - 1;
            }
          }

          // Determine whether item is loose or not.
          // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
          // for discount behavior.
          loose = next || /\n\n(?!\s*$)/.test(item);
          if (i !== l - 1) {
            next = item.charAt(item.length - 1) === '\n';
            if (!loose) loose = next;
          }

          this.tokens.push({
            type: loose
              ? 'loose_item_start'
              : 'list_item_start'
          });

          // Recurse.
          this.token(item, false, bq);

          this.tokens.push({
            type: 'list_item_end'
          });
        }

        this.tokens.push({
          type: 'list_end'
        });

        continue;
      }



      // html
      if (cap = this.rules.html.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: this.options.sanitize
            ? 'paragraph'
            : 'html',
          pre: !this.options.sanitizer
            && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
          text: cap[0]
        });
        continue;
      }

      // Tex 
      if ((cap = this.rules.tex.exec(src))) {
        if ((/\r?\n/.test(cap[0]))) {
          src = src.substring(cap[0].length);
          //console.log(cap[1]);
          this.tokens.push({
            type: 'tex',
            text: cap[1] || cap[2]
          });
          continue;
        }
      }

      // def
      if ((!bq && top) && (cap = this.rules.def.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.links[cap[1].toLowerCase()] = {
          href: cap[2],
          title: cap[3]
        };
        continue;
      }

      // table (gfm)
      if (top && (cap = this.rules.table.exec(src))) {
        src = src.substring(cap[0].length);

        item = {
          type: 'table',
          header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
        };

        for (i = 0; i < item.align.length; i++) {
          if (/^ *-+: *$/.test(item.align[i])) {
            item.align[i] = 'right';
          } else if (/^ *:-+: *$/.test(item.align[i])) {
            item.align[i] = 'center';
          } else if (/^ *:-+ *$/.test(item.align[i])) {
            item.align[i] = 'left';
          } else {
            item.align[i] = null;
          }
        }

        for (i = 0; i < item.cells.length; i++) {
          item.cells[i] = item.cells[i]
            .replace(/^ *\| *| *\| *$/g, '')
            .split(/ *\| */);
        }

        this.tokens.push(item);

        continue;
      }

      // top-level paragraph
      if (top && (cap = this.rules.paragraph.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'paragraph',
          text: cap[1].charAt(cap[1].length - 1) === '\n'
            ? cap[1].slice(0, -1)
            : cap[1]
        });
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src)) {
        // Top-level should never reach here.
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'text',
          text: cap[0]
        });
        continue;
      }

      if (src) {
        throw new
          Error('Infinite loop on byte: ' + src.charCodeAt(0));
      }
    }

    return this.tokens;
  }
}

/**
 * Static Lex Method
 */

function lex(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
}

/**
 * Inline-Level Grammar
 */

const inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[\$_*`]| {2,}\n|$)/,
  //  tex:/^(?:\$((?:\\\$|[^$])+)\$)|^(?:\[tex:(.*?)\])/,
  // tex:/^(?:\[tex:(.*?)\])/,
  tex: /^\\TeX(.*?)\\TeX/,
  custom: /^(?:\[([a-zA-Z_0-9\-_]*?)(?!\\):(.*?)\])/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = Object.assign({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = Object.assign({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = Object.assign({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = Object.assign({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

export class InlineLexer {
  constructor(links, options) {
    this.options = options || marked.defaults;
    this.links = links;
    this.rules = inline.normal;
    this.renderer = this.options.renderer || new Renderer;
    this.renderer.options = this.options;

    if (!this.links) {
      throw new
        Error('Tokens array requires a `links` property.');
    }

    if (this.options.gfm) {
      if (this.options.breaks) {
        this.rules = inline.breaks;
      } else {
        this.rules = inline.gfm;
      }
    } else if (this.options.pedantic) {
      this.rules = inline.pedantic;
    }
  }
  /**
   * Lexing/Compiling
   */

  async output(src) {
    let out = ''
      , link
      , text
      , href
      , cap;

    while (src) {
      // escape
      if ((cap = this.rules.escape.exec(src))) {
        src = src.substring(cap[0].length);
        out += cap[1];
        continue;
      }

      // autolink
      if ((cap = this.rules.autolink.exec(src))) {
        src = src.substring(cap[0].length);
        if (cap[2] === '@') {
          text = cap[1].charAt(6) === ':'
            ? this.mangle(cap[1].substring(7))
            : this.mangle(cap[1]);
          href = this.mangle('mailto:') + text;
        } else {
          text = escape(cap[1]);
          href = text;
        }
        out += this.renderer.link(href, null, text);
        continue;
      }

      // url (gfm)
      if (!this.inLink && (cap = this.rules.url.exec(src))) {
        src = src.substring(cap[0].length);
        text = escape(cap[1]);
        href = text;
        out += this.renderer.link(href, null, text);
        continue;
      }

      // tag
      if ((cap = this.rules.tag.exec(src))) {
        if (!this.inLink && /^<a /i.test(cap[0])) {
          this.inLink = true;
        } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
          this.inLink = false;
        }
        src = src.substring(cap[0].length);
        out += this.options.sanitize
          ? this.options.sanitizer
            ? this.options.sanitizer(cap[0])
            : escape(cap[0])
          : cap[0]
        continue;
      }

      // link
      if ((cap = this.rules.link.exec(src))) {
        src = src.substring(cap[0].length);
        this.inLink = true;
        out += await this.outputLink(cap, {
          href: cap[2],
          title: cap[3]
        });
        this.inLink = false;
        continue;
      }

      // TeX
      if ((cap = this.rules.tex.exec(src))) {
        src = src.substring(cap[0].length);
        out += await this.renderer.tex(cap[1] || cap[2] || cap[3]);
        continue;
      }

      // custom commands
      if ((cap = this.rules.custom.exec(src))) {
        src = src.substring(cap[0].length);
        out += await this.renderer.custom(cap[0], cap[1], cap[2]);
        continue;
      }

      // reflink, nolink
      if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
        src = src.substring(cap[0].length);
        link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
        link = this.links[link.toLowerCase()];
        if (!link || !link.href) {
          out += cap[0].charAt(0);
          src = cap[0].substring(1) + src;
          continue;
        }
        this.inLink = true;
        out += await this.outputLink(cap, link);
        this.inLink = false;
        continue;
      }

      // strong
      if (cap = this.rules.strong.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.strong(await this.output(cap[2] || cap[1]));
        continue;
      }

      // em
      if (cap = this.rules.em.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.em(await this.output(cap[2] || cap[1]));
        continue;
      }

      // code
      if ((cap = this.rules.code.exec(src))) {
        src = src.substring(cap[0].length);
        if (cap[1] == '```') {
          let lang = /^```([^\n]*?)\n/.exec(cap[0]);
          if (lang && lang[1]) {
            lang = lang[1].trim();
            const code = cap[2].replace(lang, '');
            out += this.renderer.code(code, lang);
            continue;
          }
        }
        out += this.renderer.codespan(escape(cap[2], true));
        continue;
      }

      // br
      if ((cap = this.rules.br.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.br();
        continue;
      }

      // del (gfm)
      if ((cap = this.rules.del.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.del(await this.output(cap[1]));
        continue;
      }

      // text
      if ((cap = this.rules.text.exec(src))) {
        src = src.substring(cap[0].length);
        out += this.renderer.text(escape(this.smartypants(cap[0])));
        continue;
      }

      if (src) {
        throw new
          Error('Infinite loop on byte: ' + src.charCodeAt(0));
      }
    }

    return out;
  }

  /**
   * Compile Link
   */

  async outputLink(cap, link) {
    var href = escape(link.href)
      , title = link.title ? escape(link.title) : null;

    return cap[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, await this.output(cap[1]))
      : await this.renderer.image(href, title, escape(cap[1]));
  }

  /**
   * Smartypants Transformations
   */

  smartypants(text) {
    if (!this.options.smartypants) return text;
    return text
      // em-dashes
      .replace(/---/g, '\u2014')
      // en-dashes
      .replace(/--/g, '\u2013')
      // opening singles
      .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
      // closing singles & apostrophes
      .replace(/'/g, '\u2019')
      // opening doubles
      .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
      // closing doubles
      .replace(/"/g, '\u201d')
      // ellipses
      .replace(/\.{3}/g, '\u2026');
  }

  /**
   * Mangle Links
   */

  mangle(text) {
    if (!this.options.mangle) return text;
    var out = ''
      , l = text.length
      , i = 0
      , ch;

    for (; i < l; i++) {
      ch = text.charCodeAt(i);
      if (Math.random() > 0.5) {
        ch = 'x' + ch.toString(16);
      }
      out += '&#' + ch + ';';
    }

    return out;
  }

}

/**
 * Static Lexing/Compiling Method
 */

function output(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
}



/**
 * Renderer
 */

export class Renderer {
  constructor(options) {
    this.options = options || marked.defaults;
  }
  code(code, lang, escaped) {
    let hljsclass = '';
    if (this.options.highlight) {
      var out = this.options.highlight(code, lang);
      if (out != null && out !== code) {
        escaped = escaped != false ? true : false;
        code = out;
        hljsclass = 'hljs';
      }
    }

    if (!lang) {
      return `<pre><code class="${hljsclass}">`
        + (escaped ? code : escape(code, true))
        + '\n</code></pre>';
    }

    return '<pre><code class="'
      + this.options.langPrefix
      + escape(lang, true)
      + ' ' + hljsclass + '">'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>\n';
  }

  blockquote(quote) {
    //console.log('<<<blockquote\n' + quote + '\n>>>blockquote');
    return '<blockquote>\n' + quote + '</blockquote>\n';
  }

  html(html) {
    // iframeの検出
    return html;
  }

  tex(text) {
    return text;
  }

  slug(str){
    let slug = str
      .toLowerCase()
      .trim()
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-');
    return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
      return '%' + c.charCodeAt(0).toString(16);
    });
  }

  heading(text, level, raw) {

    return '<h'
      + level
      + ' id="'
      + this.options.headerPrefix
      + this.slug(raw)
      + '">'
      + text
      + '</h'
      + level
      + '>\n';
  }

  hr() {
    return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
  }

  list(body, ordered) {
    var type = ordered ? 'ol' : 'ul';
    return '<' + type + '>\n' + body + '</' + type + '>\n';
  }

  listitem(text) {
    return '<li>' + text + '</li>\n';
  }

  paragraph(text) {
    //console.log('<<<text\n' + text + '\n>>>text');
    return '<p>' + text + '</p>\n';
  }

  table(header, body) {
    return '<table>\n'
      + '<thead>\n'
      + header
      + '</thead>\n'
      + '<tbody>\n'
      + body
      + '</tbody>\n'
      + '</table>\n';
  }

  tablerow(content) {
    return '<tr>\n' + content + '</tr>\n';
  }

  tablecell(content, flags) {
    var type = flags.header ? 'th' : 'td';
    var tag = flags.align
      ? '<' + type + ' style="text-align:' + flags.align + '">'
      : '<' + type + '>';
    return tag + content + '</' + type + '>\n';
  }

  // span level renderer
  strong(text) {
    return '<strong>' + text + '</strong>';
  }

  em(text) {
    return '<em>' + text + '</em>';
  }

  codespan(text) {
    return '<code>' + text + '</code>';
  }

  br() {
    return this.options.xhtml ? '<br/>' : '<br>';
  }

  del(text) {
    return '<del>' + text + '</del>';
  }

  link(href, title, text) {
    if (this.options.sanitize) {
      try {
        var prot = decodeURIComponent(unescape(href))
          .replace(/[^\w:]/g, '')
          .toLowerCase();
      } catch (e) {
        return '';
      }
      if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
        return '';
      }
    }
    var out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += '>' + text + '</a>';
    return out;
  }

  async image(href, title, text) {
    var out = '<img src="' + href + '" alt="' + text + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += this.options.xhtml ? '/>' : '>';
    return out;
  }

  text(text) {
    return text;
  }

  custom(text, command, param) {
    console.log(text, command, param);
    return text;
  }
}


/**
 * Parsing & Compiling
 */


class Parser {
  constructor(options, renderer) {
    this.tokens = [];
    this.token = null;

    this.options = Object.assign({}, marked.defaults, options);
    this.options.renderer = this.options.renderer || renderer || new Renderer;
    this.options.texRenderer = this.options.texRenderer || (t => t);
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
  }
  /**
   * Parse Loop
   */

  async parse(src) {
    this.inline = new InlineLexer(src.links, this.options, this.renderer);
    this.tokens = src;
    this.index = 0;

    let out = '';
    while (this.next()) {
      out += await this.tok();
    }

    return out;
  }

  /**
   * Next Token
   */

  next() {
    if (this.index < this.tokens.length) {
      this.token = this.tokens[this.index];
      this.index += 1;
      return this.token;
    }
    this.token = void 0;
    return this.token;
    //return this.token = this.tokens.pop();
  }

  /**
   * Preview Next Token
   */

  peek() {
    return this.tokens[this.index] || 0;
  }

  /**
   * Parse Text Tokens
   */

  async parseText() {
    let body = this.token.text;

    while (this.peek() && this.peek().type === 'text') {
      body += '\n' + this.next().text;
    }

    return this.inline.output(body);
  }

  /**
   * Parse Current Token
   */

  async tok() {
    switch (this.token.type) {
      case 'space': {
        return '';
      }
      case 'hr': {
        return this.renderer.hr();
      }
      case 'heading': {
        return this.renderer.heading(
          await this.inline.output(this.token.text),
          this.token.depth,
          this.token.text);
      }
      case 'code': {
        return this.renderer.code(this.token.text,
          this.token.lang,
          this.token.escaped);
      }
      case 'table': {
        let header = ''
          , body = ''
          , i
          , row
          , cell
          , j;

        // header
        cell = '';
        for (i = 0; i < this.token.header.length; i++) {
          cell += this.renderer.tablecell(
            await this.inline.output(this.token.header[i]),
            { header: true, align: this.token.align[i] }
          );
        }
        header += this.renderer.tablerow(cell);

        for (i = 0; i < this.token.cells.length; i++) {
          row = this.token.cells[i];

          cell = '';
          for (j = 0; j < row.length; j++) {
            cell += this.renderer.tablecell(
              await this.inline.output(row[j]),
              { header: false, align: this.token.align[j] }
            );
          }

          body += this.renderer.tablerow(cell);
        }
        return this.renderer.table(header, body);
      }
      case 'blockquote_start': {
        let body = '';

        while (this.next().type !== 'blockquote_end') {
          body += await this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case 'list_start': {
        let body = ''
          , ordered = this.token.ordered;

        while (this.next().type !== 'list_end') {
          body += await this.tok();
        }

        return this.renderer.list(body, ordered);
      }
      case 'list_item_start': {
        let body = '';

        while (this.next().type !== 'list_item_end') {
          body += this.token.type === 'text'
            ? await this.parseText()
            : await this.tok();
        }

        return this.renderer.listitem(body);
      }
      case 'loose_item_start': {
        let body = '';

        while (this.next().type !== 'list_item_end') {
          body += await this.tok();
        }

        return this.renderer.listitem(body);
      }
      case 'html': {
        let html = !this.token.pre && !this.options.pedantic
          ? await this.inline.output(this.token.text)
          : this.token.text;
        return this.renderer.html(html);
      }
      case 'paragraph': {
        return this.renderer.paragraph(await this.inline.output(this.token.text));
      }
      case 'tex': {
        return this.renderer.tex(this.token.text);
      }
      case 'text': {
        return this.renderer.paragraph(await this.parseText());
      }
    }
  }
}

/**
 * Static Parse Method
 */

function parse(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
}

/**
 * Helpers
 */

export function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function unescape(html) {
  // explicitly match decimal, hex, and named HTML entities 
  return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, function (_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() { }
noop.exec = noop;

/**
 * Marked
 */

export default function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = Object.assign({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt);
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function (err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function (token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function (err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = Object.assign({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
  marked.setOptions = function (opt) {
    Object.assign(marked.defaults, opt);
    return marked;
  };

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = output;

marked.parse = marked;
marked.escape = escape;
marked.unescape = unescape;
marked.replace = replace;

//export default marked;


