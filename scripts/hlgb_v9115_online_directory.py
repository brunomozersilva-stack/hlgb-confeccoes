from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'async function refreshOnlineUserDirectory()' in s:
    print('online directory fix already applied')
    raise SystemExit(0)

anchor='function renderUsers(){\n'
if anchor not in s: raise SystemExit('renderUsers anchor not found')
helper=r'''let hlgbOnlineUserDirectoryRefreshing=false;
let hlgbOnlineUserDirectoryLast=0;
async function refreshOnlineUserDirectory(){
 if(!isOwnerUser()||!cloudAccessToken||hlgbOnlineUserDirectoryRefreshing)return false;
 if(Date.now()-hlgbOnlineUserDirectoryLast<10000)return false;
 hlgbOnlineUserDirectoryRefreshing=true;
 try{
  let rows=await cloudRequest("hlgb_user_access?select=auth_id,email,name,active,access&order=updated_at.desc",{method:"GET"});
  rows=Array.isArray(rows)?rows:[];
  let changed=false;
  for(const u of (db.users||[])){
   if(u.role==="admin")continue;
   let currentEmail=normEmail(u.user||u.email);
   let match=currentEmail?rows.find(r=>normEmail(r.email)===currentEmail):null;
   if(!match){
    let key=normalizePersonKey(u.name||u.loginAlias||u.user||"");
    let matches=rows.filter(r=>r.active!==false&&normalizePersonKey(r.name||"")===key);
    matches.sort((a,b)=>(b.auth_id?1:0)-(a.auth_id?1:0));
    match=matches[0]||null;
   }
   if(!match)continue;
   let em=normEmail(match.email);
   if(em && normEmail(u.user||u.email)!==em){u.user=em;u.email=em;changed=true}
   if(match.auth_id && String(u.authId||"")!==String(match.auth_id)){u.authId=String(match.auth_id);changed=true}
   if(!u.onlineReady){u.onlineReady=true;changed=true}
   let nextActive=match.active!==false;if(u.active!==nextActive){u.active=nextActive;changed=true}
   if(Array.isArray(match.access)&&match.access.length && (!Array.isArray(u.access)||!u.access.length)){u.access=match.access.slice();changed=true}
  }
  hlgbOnlineUserDirectoryLast=Date.now();
  if(changed){try{localSaveOnly()}catch(e){} renderUsers()}
  return changed;
 }catch(e){console.warn("HLGB online user directory",e);return false}
 finally{hlgbOnlineUserDirectoryRefreshing=false}
}
'''
s=s.replace(anchor,helper+anchor,1)

old='function renderUsers(){\n if(currentUser()?.role!=="admin"){userTable.innerHTML=\'<div class="empty">Somente o administrador pode gerenciar usuários.</div>\';return}\n'
new='function renderUsers(){\n if(currentUser()?.role!=="admin"){userTable.innerHTML=\'<div class="empty">Somente o administrador pode gerenciar usuários.</div>\';return}\n if(isOwnerUser()&&cloudAccessToken&&!hlgbOnlineUserDirectoryRefreshing&&Date.now()-hlgbOnlineUserDirectoryLast>=10000)setTimeout(()=>refreshOnlineUserDirectory(),0);\n'
if old not in s: raise SystemExit('renderUsers owner refresh anchor not found')
s=s.replace(old,new,1)

if 'v91.15 Multiusuário' not in s: raise SystemExit('wrong base version')
if 'async function refreshOnlineUserDirectory()' not in s: raise SystemExit('fix missing')
p.write_text(s,encoding='utf-8')
print('v91.15 online directory fix applied')
