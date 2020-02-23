import fs from 'fs';
import ejs from 'ejs';

(async()=>{
  try {
    const projectPath = process.argv[2];
    const src = process.argv[3];
    const dest = process.argv[4];
    const pageJson = JSON.parse(await fs.promises.readFile(projectPath,'utf-8'));
    const page = await ejs.renderFile(src,{page:pageJson});
    await fs.promises.writeFile(dest,page,'utf-8');
    console.info(`render src:${src} => render dest:${dest}`);
  } catch (e) {
    
    console.error(e);
    process.abort();
  }
})();
