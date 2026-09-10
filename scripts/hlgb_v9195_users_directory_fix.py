from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Atualiza versão visual.
s=s.replace('v91.94','v91.95').replace('V91.94','V91.95')

start=s.find('async function refreshOnlineUserDirectory(){')
if start<0:
    raise SystemExit('refreshOnlineUserDirectory não encontrada')
brace=s.find('{',start)
depth=0; quote=None; esc=False; i=brace
while i<len(s):
    ch=s[i]
    if quote:
        if esc: esc=False
        elif ch=='\\': esc=True
        elif ch==quote: quote=None
    else:
        if ch in ('"',"'",'`'): quote=ch
        elif ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0:
                end=i+1
                break
    i+=1
else:
    raise SystemExit('fim de refreshOnlineUserDirectory não encontrado')

new_func=r'''async function refreshOnlineUserDirectory(){
 if(!isOwnerUser()||!cloudAccessToken||hlgbOnlineUserDirectoryRefreshing)return false;
 if(Date.now()-hlgbOnlineUserDirectoryLast<3000)return false;
 hlgbOnlineUserDirectoryRefreshing=true;
 try{
  let rows=await cloudRequest("hlgb_user_access?select=auth_id,email,name,role,active,access&order=updated_at.desc",{method:"GET"});
  rows=Array.isArray(rows)?rows:[];
  db.users=Array.isArray(db.users)?db.users:[];
  let changed=false;

  // 1) Atualiza perfis locais que já existem.
  for(const u of db.users){
   if(u.role==="admin"&&normEmail(u.user||u.email)===normEmail(HLGB_OWNER_EMAIL))continue;
   let currentEmail=normEmail(u.user||u.email);
   let match=currentEmail?rows.find(r=>normEmail(r.email)===currentEmail):null;
   if(!match&&u.authId)match=rows.find(r=>String(r.auth_id||'')===String(u.authId));
   if(!match){
    let key=normalizePersonKey(u.name||u.loginAlias||u.user||"");
    let matches=rows.filter(r=>normalizePersonKey(r.name||"")===key);
    matches.sort((a,b)=>(b.auth_id?1:0)-(a.auth_id?1:0));
    match=matches[0]||null;
   }
   if(!match)continue;
   let em=normEmail(match.email),uid=String(match.auth_id||'');
   if(em&&normEmail(u.user||u.email)!==em){u.user=em;u.email=em;changed=true}
   if(uid&&String(u.authId||'')!==uid){u.authId=uid;changed=true}
   let nextName=String(match.name||u.name||em);if(nextName&&u.name!==nextName){u.name=nextName;changed=true}
   if(!u.onlineReady){u.onlineReady=true;changed=true}
   let nextActive=match.active!==false;if(u.active!==nextActive){u.active=nextActive;changed=true}
   let nextRole=em===normEmail(HLGB_OWNER_EMAIL)?'admin':String(match.role||u.role||'user');if(u.role!==nextRole){u.role=nextRole;changed=true}
   if(Array.isArray(match.access)&&JSON.stringify(u.access||[])!==JSON.stringify(match.access)){u.access=match.access.slice();changed=true}
  }

  // 2) Se existe na nuvem e sumiu do db.users local, recria apenas a entrada visual/local.
  // A fonte continua sendo hlgb_user_access; nenhum usuário é recriado no Supabase Auth.
  for(const r of rows){
   let em=normEmail(r.email),uid=String(r.auth_id||'');
   if(!em)continue;
   let existing=db.users.find(u=>(uid&&String(u.authId||'')===uid)||normEmail(u.user||u.email)===em);
   if(existing)continue;
   let profile={
    id:Date.now()+Math.random(),
    name:r.name||em,
    user:em,
    email:em,
    authId:uid,
    role:em===normEmail(HLGB_OWNER_EMAIL)?'admin':String(r.role||'user'),
    active:r.active!==false,
    access:Array.isArray(r.access)?r.access.slice():[],
    onlineReady:true
   };
   db.users.push(profile);changed=true;
  }

  hlgbOnlineUserDirectoryLast=Date.now();
  if(changed){try{localSaveOnly()}catch(e){} renderUsers()}
  return changed;
 }catch(e){console.warn("HLGB online user directory",e);return false}
 finally{hlgbOnlineUserDirectoryRefreshing=false}
}'''

s=s[:start]+new_func+s[end:]
p.write_text(s,encoding='utf-8')

# Valida scripts inline JS.
html=p.read_text(encoding='utf-8')
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
checked=0
for idx,m in enumerate(pat.finditer(html)):
    body=m.group(1)
    if not body.strip():
        continue
    f=Path(tempfile.gettempdir())/f'hlgb9195_{idx}.js'
    f.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    if r.returncode!=0:
        print(r.stderr)
        raise SystemExit(f'JavaScript inválido no script {idx}')
    checked+=1

if 'hlgb_user_access?select=auth_id,email,name,role,active,access' not in html:
    raise SystemExit('diretório online incompleto')
if 'db.users.push(profile)' not in new_func:
    raise SystemExit('reposição de usuário ausente')
print('OK v91.95:',checked,'scripts validados')
