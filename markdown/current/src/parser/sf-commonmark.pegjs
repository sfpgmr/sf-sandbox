{

}

document = header:header meta:meta style:style? body:body {
 return {header:header,meta:meta,style:style,body:body}
}

meta = json_ld

header = ('#' _ ) ? !
