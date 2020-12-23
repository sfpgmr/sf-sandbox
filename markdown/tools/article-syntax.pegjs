{

  class Node {
    constructor(name,attributes,content){
      name && (this.name = name);
      attributes && (this.attributes = attributes);
      content && (this.content = content);
    }
  }

  class HtmlNode extends Node {
    constructor(name,attributes,content){
      super(name,attributes,content);
    }
  }
 
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

start = title:Title? __ metadata:MetaData? aditionalStyle:(__ s:AditionalStyle {return s})? body:Body {
  return {
    title:title,
    metadata:metadata,
    aditionalStyle:aditionalStyle,
    body:body
  };
}

// ブログのタイトル
Title "Title" = "#" _ title:$([^\r\n]*) [\r]?[\n] { return new Node('title',null,title)}

JSON 'JSON' = '{' __ $([^\{\}]+ / '{' JSON '}')+  __ '}' 
{
  try {
    let json = JSON.parse(text());
    return json;
  } catch(e){
    error('JSON Parse Error ' + e);
  }

}

// 更新日などのメタデータが入る
//MetaData "Meta Data" = metastart:('<script'i _ 'type="application/json"'i _ 'id="sfblog"'i _ ">" __ )? '{'__ json:(ch:(!('</script'i  __ '>') c:. { return c })+ { return ch.join('') }) __ '}' metaend:(__ '</script'i  __ '>')? 
MetaData "Meta Data" = '<script'i _ 'type="application/json"'i _ ">" __  json:JSON __ '</script'i  __ '>' { return json;} / JSON 

AditionalStyle = start:"<style>" __ style:(ch:(!('</style'i  __ '>') c:. { return c })* { return ch.join('') }) __ end:'</style>' 
{
  return new Node('AddtionalStyle',null,style);
}

Body = text:$.* {return new Node('Body',null,text);};

__ "space characters"
  = [\r\n \t\u000C]*

_ "space characters without cr,lf"
  = [ \t\u000c]*