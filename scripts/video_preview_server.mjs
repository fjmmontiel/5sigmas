import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/** Read-only localhost preview of the actual build. HTTP Range is required for native seeking. */
export async function startVideoPreview(directory='site') {
  const root=fs.realpathSync(directory);
  const types={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.css':'text/css','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2','.woff':'font/woff','.xml':'application/xml'};
  const server=http.createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      let file=path.resolve(root,'.'+pathname);
      if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      let stat=fs.statSync(file);
      if(stat.isDirectory())file=path.join(file,'index.html');
      file=fs.realpathSync(file);
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      stat=fs.statSync(file);if(!stat.isFile()){res.writeHead(404);res.end();return;}
      const size=stat.size;let start=0,end=size-1,status=200;
      const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
      if(req.headers.range){
        const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
        if(!m[1])start=Math.max(0,size-Number(m[2]));
        else {start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
      }
      headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
      if(req.method==='HEAD'||!size){res.end();return;}
      const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    }catch(error){if(!res.headersSent)res.writeHead(error.code==='ENOENT'?'404':'500');res.end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
