'use strict';
const fs=require('fs');
const assert=require('assert');
const sql=fs.readFileSync('supabase/hlgb_auditor_report.sql','utf8');

assert(sql.includes('create or replace function public.hlgb_auditor_report'),'RPC do Auditor deve existir como fonte canônica');
assert(/security\s+definer/i.test(sql),'RPC privado deve manter SECURITY DEFINER');
assert(sql.includes('v_uid uuid := auth.uid()'),'autorização deve partir do auth.uid atual');
assert(sql.includes("raise exception 'not_authenticated'"),'sessão anônima deve continuar bloqueada');
assert(sql.includes("v_owner_email text := 'bruno.mozer.silva@gmail.com'"),'proprietário deve usar a mesma identidade canônica do ERP');
assert(sql.includes('au.id = v_uid'),'proprietário só pode ser reconhecido quando a conta autenticada é a própria conta canônica');
assert(sql.includes("coalesce(u.access,'[]'::jsonb) ? 'auditor'"),'usuário secundário deve exigir permissão auditor explícita');
assert(sql.includes('coalesce(u.active,true)=true'),'usuário secundário inativo não pode abrir o Auditor');
assert(sql.includes("raise exception 'auditor_access_required'"),'sessões sem autorização devem continuar bloqueadas');
assert(sql.includes('with owner_user as'),'proprietário deve entrar nas estatísticas do próprio Auditor');
assert(sql.includes("'Administrador'::text as name"),'perfil proprietário deve aparecer como Administrador');
assert(sql.includes('union all\n    select * from secondary_users'),'proprietário e secundários devem compartilhar a mesma leitura sem duplicar autoridade');
assert(!/v_allowed\s*:=\s*true/i.test(sql),'RPC não pode liberar todos os usuários autenticados');
assert(!/where\s+auth\.uid\(\)\s+is\s+not\s+null[\s\S]*into\s+v_allowed/i.test(sql),'estar autenticado sozinho não pode conceder Auditor');

console.log('OK Auditor owner RPC: proprietário canônico + permissão explícita para secundários.');
