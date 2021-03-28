{
  const nsPrefix = 'sf';

  class Node {
    constructor(name,attributes,content = null ,namespace = null){
      namespace && (this.namespace = namespace);
      name && (this.name = name);
      attributes && (this.attributes = attributes);
      content && (this.content = content);
      this.location = location();
    }
  }

  class HtmlNode extends Node {
    constructor(name,attributes,content,namespace){
      super(name,attributes,content,namespace);
    }
  }


  function makeNode(name,attributes,content,namespace){
    // attributesの中にifが含まれるか確認する
    // if(attributes && attributes.length){
    //   for(let i = 0,e = attributes.length;i < e;++i){
    //     const attr = attributes[i];
    //     if(!attr){
    //       console.log(attributes);
    //     }
    //     if(attr && attr.namespace == 'sf' && attr.name == 'if'){
    //       attributes = attributes.splice(i,1);
    //       const elm  = new HtmlNode(attr.name,[{value:attr.value}],new HtmlNode(name,attributes,content,namespace),attr.namespace);
    //       elm.if = true;
    //       return elm;
    //     }
    //   }
    // }
    return new HtmlNode(name,attributes,content,namespace);
  }

  // function makeHtmlNode(name, attrs,null,namespace){
  //   for(const attr of attrs) {
  //     if(attr.namespace == nsPrefix){
  //       switch(attr.name){
  //         case 'if':
            
  //         break;
  //       }
  //     }
  //   }
  // }
 
  function reduceToObj (xs)
  {
    let attr = {};
    for(const x of xs){
      if(x && x.name){
        attr[x.name] = x.text;
      }
    }
    return attr;
  }
}

// start = title:Title __ metadata:MetaData aditionalStyle:(__ s:AditionalStyle {return s})? body:BODY {
//   return {
//     title:title.content,
//     metadata:metadata,
//     aditionalStyle:aditionalStyle,
//     body:body
//   };
// }

// ブログのタイトル
// Title "title" = "#" _ title:$([^\r\n]*) [\r]?[\n] { return new Node('title',null,title)}

// 更新日などのメタデータが入る
// MetaData "metadata" = metastart:('<script'i _ 'type="application/json"'i _ 'id="sfblog"'i _ ">")? __ '{' __ json:(ch:(!('</script'i  __ '>') c:. { return c })* { return ch.join('') }) __ '}' __ metaend:('</script'i    __ '>')? {
//   if(!!metastart != !!metaend) {
//     error('<script> tag unmatch');
//   }
//   return new Node('meta-data',JSON.parse(json));
// }

// AditionalStyle = start:"<style>" __ style:(ch:(!('</style'i  __ '>') c:. { return c })* { return ch.join('') }) __ end:'</style>' 
// {
//   return new Node('AddtionalStyle',style);
// }

// BODY 'body' = ( __ / CustomTag / HTMLDocument )*

// CustomTag = '[' Symbol ':' ']'

/****************************************************
* HTML parser
*****************************************************/

/**
 * HTMLDocument is just a collection of elements.
 */
HTMLDocument = __ nodes:Element* __  { return nodes; }

/**
 * Elements - https://www.w3.org/TR/html5/syntax.html#elements-0
 */
Element  = RawText / Nested / PlaceHolder / Void / Comment / DocType / Text 

RawText =  MarkdownTag / StaticScript / Script / Style / Textarea / Title / PlainText 

Meta    "Meta"    = '<sf:meta'i    attrs:Attributes '>' __ content:(ch:(!('</sf:meta'i    __ '>') c:. { return c })* { return ch.join('') }) __ '</sf:meta'i    __ '>' __ { return makeNode('meta', attrs, content,'sf'); }

StaticScript    "static script"    = '<sf:script'i    attrs:Attributes '>' __ content:(ch:(!('</sf:script'i    __ '>') c:. { return c })* { return ch.join('') }) __ '</sf:script'i    __ '>' __ { return makeNode('script', attrs, content,'sf'); }

Script    "script"    = '<script'i    attrs:Attributes '>' __ content:(PlaceHolder / (ch:(!('</script'i    __ '>') !PlaceHolder c:. { return c })+ { return ch.join('') }))+ __ '</script'i    __ '>' __ { return makeNode('script', attrs, content); }
Style     "style"     = '<style'i     attrs:Attributes '>' __ content:(PlaceHolder / (ch:(!('</style'i     __ '>') !PlaceHolder c:. { return c })+ { return ch.join('') }))+ __ '</style'i     __ '>' __ { return makeNode('style', attrs, content); }
Textarea  "textarea"  = '<textarea'i  attrs:Attributes '>' __ content:(PlaceHolder / (ch:(!('</textarea'i  __ '>') !PlaceHolder c:. { return c })+ { return ch.join('') }))+ __ '</textarea'i  __ '>' __ { return makeNode('textarea', attrs, content); }
Title     "title"     = '<title'i     attrs:Attributes '>' __ content:(PlaceHolder / (ch:(!('</title'i     __ '>') !PlaceHolder c:. { return c })+ { return ch.join('') }))+ __ '</title'i     __ '>' __ { return makeNode('title', attrs, content); }
PlainText "plaintext" = '<plaintext'i attrs:Attributes '>' __ content:(PlaceHolder / (ch:(!('</plaintext'i __ '>') !PlaceHolder c:. { return c })+ { return ch.join('') }))+ __ '</plaintext'i __ '>' __ { return makeNode('plaintext', attrs, content); }

Nested    "Nested Element"   = begin:TagBegin __ content:Element* __ end:TagEnd __ &{
  let begin_ = begin.if ? begin.content : begin;
  if(begin_.name == end.name && ((!begin_.namespace && !end.namespace) || (begin_.namespace && (begin_.namespace == end.namespace)) )){return true} /*else {error('Start tag and end tag do not match.')}; */
  return false;
} {
  begin.content = content;
  return begin;
}

TagBegin  "begin tag" = '<'  namespace:NameSpace? name:Symbol attrs:Attributes? '>' { return makeNode(name.toLowerCase(), attrs,null,namespace); }
TagEnd    "end tag"   = '</' namespace:NameSpace? name:Symbol __               '>' { return {name:name.toLowerCase(),namespace:namespace,location:location()}; }

NameSpace 'namespace' = @Symbol ':'

/**
 * Void element (with self closing tag, w/o content)
 * - 'area'i / 'base'i / 'br'i / 'col'i / 'embed'i / 'hr'i / 'img'i / 'input'i / 'keygen'i / 'link'i / 'meta'i / 'param'i / 'source'i / 'track'i / 'wbr'i
 */
VoidSymbol = 'area'i / 'base'i / 'br'i / 'col'i / 'embed'i / 'hr'i / 'img'i / 'input'i / 'keygen'i / 'link'i / 'meta'i / 'param'i / 'source'i / 'track'i / 'wbr'i
Void      "void element"   = '<' namespace:NameSpace? name:Symbol attrs:Attributes ('/>' / '>') __ { return makeNode(name, attrs,null,namespace); }

Comment   "comment"   = '<!--' text:CommentText '-->' __ {
    return makeNode('comment', null, text);
  }

CommentText = ch:$(!'-->' . )* { return ch; }

DocType   "doctype"   = '<!DOCTYPE'i __ root:Symbol __ type:('public'i / 'system'i)? __ text:String* '>' __ {
    const node = makeNode('doctype');
    node.root = root && root.toLowerCase();
    node.type = type && type.toLowerCase();
    //node.content = content && content.toLowerCase();
    return node;
  }

Text "text"
  =  ch:$(!PlaceHolder [^<])+ {
    return makeNode('text', null,ch);
  }
  / ch:(!PlaceHolder !TagEnd !Void !Comment !DocType c:. { c })+ {
    return makeNode('text', null, ch.join(''));
  }

// TemplateTagStart =  ![\\] '<sf'
// TemplateTagEnd = ![\\] '/sf>'

// Code 'code' = CodeStart expression:$(!CodeEnd .)+ CodeEnd { return {name:'code',expression:expression}; }
// CodeExpression 'code expression' = __ / (!CodeStart !CodeEnd . )+ {return text();}


PlaceHolderStart = ![\\] '{{' type:[#@]  {return type;}
PlaceHolderEnd = ![\\] '}}'
PlaceHolder 'placeholder' = type:PlaceHolderStart expression:$(!PlaceHolderEnd .)+  PlaceHolderEnd { return {name:'placeholder',type:type,expression:expression,location:location()}; }

/**
* Markdown
*/

// Markdown    "Markdown"    = '<sf:md'i    attrs:Attributes '>' __ content:(body:(!('</sf:md'i    __ '>') MdTopLevel )* { return body; }) __ '</sf:md'i    __ '>' __ { return makeNode('md', attrs, content,'sf'); 
// }

MdSpace "Markdown Space" = " " /  "  " /  "   "

// MdLineBreak = "  " NL
// MdTopLevel = (MdHeader / MdCodeBlock / MdTable / MdQuote / MdParagraph /  MdList / __ )+
// MdHeader "Markdown Heading" = MdSpace? level:$'#'+ &{ if(level.length > 6) error('Heading Level');} " " body:MdInline {return makeNode('MdHeading',{level:level.length,body:body})}
// MdParagraph "Markdown Paragraph" = MdSpace? ch:$(!(MdHeader / MdCodeBlock / MdTable / MdQuote  / (NL _ NL) ) .)* { return makeNode('MdParagraph',{content:ch});}
// MdParagraphInner = (MdParagraphContent _ NL* )+
// MdParagraphContent = MdInline MdLineBreak?


MarkdownTag "Markdown Tag" = '<sf:md'i attrs:Attributes? '>' __ content:Markdown*  __ '</sf:md'i  __ '>' __ { return makeNode('markdown', attrs, content,'sf'); }

// MarkdownElement = StaticScript / Script / Style / Textarea / Title / PlainText / Nested / PlaceHolder / Void / Comment / Text / Markdown
MarkdownElement = MdHeading / MdCode / MdFences / MdHr / MdBlockQuote / MdList / MdDef / MdTable 
Markdown = MdHeading / MdCode / MdFences / MdHr / MdBlockQuote / MdList / MdDef / MdTable / MdParagraph 

MdCode "Markdown Code" = code:("    " $[^\n]+ $[\n]*)+ {return makeNode('MdCode',null,code,'sf')} 
MdFences "Markdown Fences" = 
  MdSpace? "```" [`]* lang:$([^`\n]* [\n])? body:$([^\n]* [\n])? __ "```" [`]* {return makeNode('MdFences',{lang:lang,body:body},null,'sf')}
  / MdSpace? "~~~" [~]* body:$([^\n]* [\n])? __ "~~~" [~]* {return makeNode('MdFences',{body:body},null,'sf')}
MdHr "Markdown hr" = MdSpace? (('-' _ '-' _ '-' _ ('-' _)*) / ('_' _ '_' _ '_' _ ('_' _)*) / ('*' _ '*' _ '*' _ ('*' _)*)) [\n]+ {return makeNode('mdHr',null,null,'sf')}

MdHeading "Markdown Heading" = _ level:'#'+  &{ if(level.length > 6) error('Heading Level'); return true;} " " title:$(!NL .)* NL+  {return makeNode('MdHeading',{level:level.length,title:title})}
//MdHeading "Markdown Heading" = (!'</sf:md'i  __ '>' .)+ 
MdParagraph "Markdown Palagraph" = paragraph:$(!MarkdownElement !('</sf:md'i  __ '>') .)+ {return makeNode('MdParagraph',null,paragraph,'sf')}
MdBlockQuote  "Markdown Blockquote" = MdSpace? '>' body:MarkdownElement? [\n]* {return makeNode('MdBlockQuote',null,body,'sf');}
MdBullet "Markdown Bullet" = $([*+-] / [1-9][.)])
MdLabel "Markdown Label" = !(__ [\]] ) label:$('\\' [\[\]] / [^\[\]])+ {return label;}
MdDef = MdSpace? '[' label:MdLabel ']: ' '\n'? __ ('<' $(!__  !'>' .)* '>')?  $((' '+ [\n]?  ' '*) / (' '* [\n] ' '*) MdTitle)? ' '* [\n]+ 
MdTitle "Markdown Title" = ('"' ( '\\"' / [^"\\])* '"') / ("'" $("\\'" / [^'\\])* "'") / "(" [^()]* ")" {return makeNode('mdTitle',null,text(),'sf'); }
MdList "Markdown List" = MdSpace? bullet:MdBullet __ .*
MdTable "Markdown Table" = _ ([^|\n ] .* "|" .* ) [\n] 

// Expression 'expression' = __ (Block / [^{}]+ __ )* {return text();}
//Block 'block' = '{' Expression '}' {return text();}

/**
 * Element attributes
 */
Attributes = __ attrs:Attribute* __ { return (attrs && attrs.length) ? attrs : null;}

Attribute "attribute"
  = namespace:NameSpace? name:Symbol __ value:(__ '=' __ @(PlaceHolder / String))? __ { return {namespace:namespace,name:name, value:value?value[0]:undefined,location:location()}; }
  / @PlaceHolder __ 
  / !'/>' [^> ]+ __ { return null; }

/**
 * String - single, double, w/o quotes
 */
String "string"
  =  '"'  ch:(PlaceHolder / $(!PlaceHolder [^"])+)* '"'  __ { return ch; }
  / '\'' ch:(PlaceHolder / $(!PlaceHolder [^'])+)*  '\'' __ { return ch; }
  /      ch:(PlaceHolder / $(!PlaceHolder [^"'<>` ])+)+  __ { return ch; }

/**
 * Tag name, attribute name
 */
Symbol = h:[a-zA-Z0-9_\-] t:[a-zA-Z0-9_\-]* { return h + t.join('') }

__ "space characters"
  = [\r\n \t\u000C]*

_ "space characters without cr,lf"
  = [ \t\u000c]*

NL = "\r\n" / "\n"
