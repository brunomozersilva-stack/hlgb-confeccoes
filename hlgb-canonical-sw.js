/* HLGB — Service Worker canônico v92.64 */
const CANONICAL='app-stable3.html';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.mode!=='navigate')return;
  let u;try{u=new URL(req.url)}catch(e){return}
  if(u.origin!==self.location.origin)return;
  const file=(u.pathname.split('/').pop()||'').toLowerCase();
  const isLegacy=/^app\d+\.html$/.test(file)||file==='app-stable.html'||file==='app-stable2.html';
  if(!isLegacy||file===CANONICAL)return;
  const target=new URL('./'+CANONICAL,self.registration.scope);
  target.searchParams.set('reroute','legacy');
  target.searchParams.set('from',file);
  event.respondWith(Promise.resolve(Response.redirect(target.href,302)));
});
