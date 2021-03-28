import fs from 'fs';
import marked from 'marked';

const src = fs.readFileSync('./test/test-2.html','utf-8');
console.log(marked.parser(marked.lexer(src)));