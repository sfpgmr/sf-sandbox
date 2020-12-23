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
    title:title.content,
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
MetaData "Meta Data" = '<script'i _ 'type="application/json"'i _ 'id="sfblog"'i _ ">" __  json:JSON __ '</script'i  __ '>' { return json;} / JSON 

AditionalStyle = start:"<style>" __ style:(ch:(!('</style'i  __ '>') c:. { return c })* { return ch.join('') }) __ end:'</style>' 
{
  return new Node('AddtionalStyle',null,style);
}

Body = body:Line* 

Line =  Heading / BreakLine / Text / EmptyLine / LineBreak

Heading 'Heading' = heading:$[#]+ _ text:$(!LineBreak .)+ LineBreak {
  if(heading.length > 6){
    error("heading mark length is too long.");
  }
  return new Node('Heading',{level:heading.length},text);
}

Text 'Text Line' = l:$(!BreakLine !LineBreak .)+ br:(BreakLine / LineBreak)? {return new Node('Text',{break:br && br.name && br.name == 'BreakLine'},l);}

BreakLine 'Break Line' = '  ' LineBreak {return new Node('BreakLine');}

LineBreak 'Line Break' = [\r]? [\n] {return new Node('LineBreak');}

EmptyLine 'Empty Line' = LineBreak LineBreak {return new Node('EmptyLine')}

//Link = '[' alt:LinkText ']' __ '('__ url:$.*  __ ')' { return new Node('link',{alt:alt,href:url})}

//LinkText = $('[' [^\]]* ']' / [^\]]*)

//Text = !Link $.* { return new Node('Text',null,text()); }

/**
 * String - single, double, w/o quotes
 */
String "string"
  = '"'  ch:[^"]*      '"'  __ { return ch.join(''); }
  / '\'' ch:[^']*      '\'' __ { return ch.join(''); }
  /      ch:[^"'<>` ]+      __ { return ch.join(''); }

/**
 * Tag name, attribute name
 */
Symbol = h:[a-zA-Z0-9_\-] t:[a-zA-Z0-9:_\-]* { return h + t.join('') }

__ "space characters"
  = [\r\n \t\u000C]*

_ "space characters without cr,lf"
  = [ \t\u000c]*