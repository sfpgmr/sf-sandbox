{
  const nsPrefix = 'sf';

  class Node {
    constructor(name,attributes,content,namespace = null){
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
    if(attributes && attributes.length){
      for(let i = 0,e = attributes.length;i < e;++i){
        const attr = attributes[i];
        if(!attr){
          console.log(attributes);
        }
        if(attr && attr.namespace == 'sf' && attr.name == 'if'){
          attributes = attributes.splice(i,1);
          const elm  = new HtmlNode(attr.name,[{value:attr.value}],new HtmlNode(name,attributes,content,namespace),attr.namespace);
          elm.if = true;
          return elm;
        }
      }
    }
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
HTMLDocument = __ nodes:Element* { return nodes; }

/**
 * Elements - https://www.w3.org/TR/html5/syntax.html#elements-0
 */
Element  = RawText / Nested / PlaceHolder / Void / Comment / DocType / Text

RawText  = Markdown / StaticScript / Script / Style / Textarea / Title / PlainText

Markdown    "Markdown"    = '<sf:md'i    attrs:Attributes '>' __ content:(ch:(!('</sf:md'i    __ '>') c:. { return c })* { return ch.join('') }) __ '</sf:md'i    __ '>' __ { return makeNode('md', attrs, content,'sf'); }

StaticScript    "static script"    = '<sf:script'i    attrs:Attributes '>' __ content:(ch:(!('</sf:script'i    __ '>') c:. { return c })* { return ch.join('') }) __ '</sf:script'i    __ '>' __ { return makeNode('script', attrs, content,'sf'); }

Script    "script"    = '<script'i    attrs:Attributes '>' __ content:(ch:(!('</script'i    __ '>') c:. { return c })* { return ch.join('') }) __ '</script'i    __ '>' __ { return makeNode('script', attrs, content); }
Style     "style"     = '<style'i     attrs:Attributes '>' __ content:(ch:(!('</style'i     __ '>') c:. { return c })* { return ch.join('') }) __ '</style'i     __ '>' __ { return makeNode('style', attrs, content); }
Textarea  "textarea"  = '<textarea'i  attrs:Attributes '>' __ content:(ch:(!('</textarea'i  __ '>') c:. { return c })* { return ch.join('') }) __ '</textarea'i  __ '>' __ { return makeNode('textarea', attrs, content); }
Title     "title"     = '<title'i     attrs:Attributes '>' __ content:(ch:(!('</title'i     __ '>') c:. { return c })* { return ch.join('') }) __ '</title'i     __ '>' __ { return makeNode('title', attrs, content); }
PlainText "plaintext" = '<plaintext'i attrs:Attributes '>' __ content:(ch:(!('</plaintext'i __ '>') c:. { return c })* { return ch.join('') }) __ '</plaintext'i __ '>' __ { return makeNode('plaintext', attrs, content); }

Nested    "element"   = begin:TagBegin __ content:Element* __ end:TagEnd __ &{
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


PlaceHolderStart = ![\\] type:[$@#] '{' {return type;}
PlaceHolderEnd = ![\\] '}'
PlaceHolder 'placeholder' = type:PlaceHolderStart expression:$(!PlaceHolderEnd .)+  PlaceHolderEnd { return {name:'placeholder',type:type,expression:expression,location:location()}; }



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
