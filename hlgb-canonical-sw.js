/* HLGB — Service Worker canônico v92.70 */
const CANONICAL='app-stable3.html',VERSION='92.70';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{try{for(const k of await caches.keys())await caches.delete(k)}catch(e){}await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.mode!=='navigate')return;let u;try{u=new URL(req.url)}catch(e){return}if(u.origin!==self.location.origin)return;
 const file=(u.pathname.split('/').pop()||'').toLowerCase(),legacy=/^app\d+\.html$/.test(file)||file==='app-stable.html'||file==='app-stable2.html';
 if(legacy&&file!==CANONICAL){const target=new URL('./'+CANONICAL,self.registration.scope);target.searchParams.set('v',VERSION);target.searchParams.set('fresh',Date.now());target.searchParams.set('reroute','legacy');target.searchParams.set('from',file);event.respondWith(Promise.resolve(Response.redirect(target.href,302)));return}
 if(file===CANONICAL){event.respondWith((async()=>{try{const headers=new Headers(req.headers);headers.set('cache-control','no-cache');return await fetch(new Request(req,{cache:'reload',headers}))}catch(e){return fetch(req)}})())}
});
