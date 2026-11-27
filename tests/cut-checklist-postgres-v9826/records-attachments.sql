-- Isolated fixture only. Bytea verifies real bytes here; production must use private storage.
create table checklist_lab.record_attachments(
 cut_id text not null,version bigint not null,sha256 text not null check(sha256~'^[0-9a-f]{64}$'),
 file_name text not null,mime text not null,bytes bytea not null,
 actor text not null,recorded_at timestamptz not null default clock_timestamp(),
 primary key(cut_id,version,sha256),
 foreign key(cut_id,version) references checklist_lab.record_history(cut_id,version)
);
alter table checklist_lab.record_attachments enable row level security;
grant select,insert on checklist_lab.record_attachments to checklist_lab_writer;
create policy attachment_writer_read on checklist_lab.record_attachments for select to checklist_lab_writer using(true);
create policy attachment_writer_insert on checklist_lab.record_attachments for insert to checklist_lab_writer with check(actor='checklist_lab_operator');
-- Operator gets no direct table access; all operations use exact checklist identity.
create function checklist_lab.attach_record_file(p_cut text,p_order text,p_product text,p_version bigint,p_name text,p_mime text,p_sha text,p_bytes bytea)
returns jsonb language plpgsql security definer set search_path='' as $attach$
declare h checklist_lab.record_history%rowtype; a checklist_lab.record_attachments%rowtype; n integer; detected text;
begin
 if current_setting('role',true) is distinct from 'checklist_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 n:=octet_length(p_bytes);
 if p_cut is null or p_order is null or p_product is null or p_version is null or p_version<1 or p_name is null or length(trim(p_name)) not between 1 and 120 or p_name~'[[:cntrl:]]' or strpos(p_name,'/')>0 or strpos(p_name,chr(92))>0 or p_mime is null or p_sha is null or p_sha!~'^[0-9a-f]{64}$' or n is null or n not between 12 and 5242880 then raise exception 'attachment-input';end if;
 detected:=case when substring(p_bytes from 1 for 5)=convert_to('%PDF-','UTF8') then 'application/pdf'
 when substring(p_bytes from 1 for 3)=decode('ffd8ff','hex') then 'image/jpeg'
 when substring(p_bytes from 1 for 8)=decode('89504e470d0a1a0a','hex') then 'image/png'
 when substring(p_bytes from 1 for 4)=convert_to('RIFF','UTF8') and substring(p_bytes from 9 for 4)=convert_to('WEBP','UTF8') then 'image/webp' else null end;
 if detected is distinct from p_mime or encode(sha256(p_bytes),'hex') is distinct from p_sha then raise exception 'attachment-content-mismatch';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('checklist-lab:'||p_cut,0));
 select * into h from checklist_lab.record_history x where x.cut_id=p_cut and x.order_id=p_order and x.product_id=p_product and x.version=p_version;
 if not found then raise exception 'attachment-checklist-identity';end if;
 select * into a from checklist_lab.record_attachments x where x.cut_id=p_cut and x.version=p_version and x.sha256=p_sha;
 if found then
  if a.file_name<>p_name or a.mime<>p_mime or a.bytes<>p_bytes then raise exception 'attachment-conflict';end if;
 else
  if (select count(*) from checklist_lab.record_attachments x where x.cut_id=p_cut and x.version=p_version)>=3 then raise exception 'attachment-limit';end if;
  insert into checklist_lab.record_attachments(cut_id,version,sha256,file_name,mime,bytes,actor) values(p_cut,p_version,p_sha,p_name,p_mime,p_bytes,'checklist_lab_operator') returning * into a;
 end if;
 return jsonb_build_object('cutId',p_cut,'orderId',p_order,'productId',p_product,'version',p_version,'sha256',a.sha256,'name',a.file_name,'mime',a.mime,'size',octet_length(a.bytes),'actor',a.actor,'recordedAt',a.recorded_at,'contentVerified',true,'private',true);
end$attach$;
create function checklist_lab.list_record_attachments(p_cut text,p_order text,p_product text,p_version bigint)
returns jsonb language plpgsql security definer set search_path='' as $list$
begin
 if current_setting('role',true) is distinct from 'checklist_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 if not exists(select 1 from checklist_lab.record_history h where h.cut_id=p_cut and h.order_id=p_order and h.product_id=p_product and h.version=p_version) then raise exception 'attachment-checklist-identity';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('cutId',p_cut,'orderId',p_order,'productId',p_product,'version',p_version,'sha256',a.sha256,'name',a.file_name,'mime',a.mime,'size',octet_length(a.bytes),'actor',a.actor,'recordedAt',a.recorded_at,'contentVerified',true,'private',true) order by a.recorded_at,a.sha256),'[]'::jsonb) from checklist_lab.record_attachments a where a.cut_id=p_cut and a.version=p_version);
end$list$;
create function checklist_lab.read_record_attachment(p_cut text,p_order text,p_product text,p_version bigint,p_sha text)
returns bytea language plpgsql security definer set search_path='' as $read$
declare b bytea;
begin
 if current_setting('role',true) is distinct from 'checklist_lab_operator' then raise exception 'permission' using errcode='42501';end if;
 select a.bytes into b from checklist_lab.record_attachments a join checklist_lab.record_history h on h.cut_id=a.cut_id and h.version=a.version where h.cut_id=p_cut and h.order_id=p_order and h.product_id=p_product and h.version=p_version and a.sha256=p_sha;
 return b;
end$read$;
grant create on schema checklist_lab to checklist_lab_writer;
alter function checklist_lab.attach_record_file(text,text,text,bigint,text,text,text,bytea) owner to checklist_lab_writer;
alter function checklist_lab.list_record_attachments(text,text,text,bigint) owner to checklist_lab_writer;
alter function checklist_lab.read_record_attachment(text,text,text,bigint,text) owner to checklist_lab_writer;
revoke create on schema checklist_lab from checklist_lab_writer;
revoke all on function checklist_lab.attach_record_file(text,text,text,bigint,text,text,text,bytea),checklist_lab.list_record_attachments(text,text,text,bigint),checklist_lab.read_record_attachment(text,text,text,bigint,text) from public;
grant execute on function checklist_lab.attach_record_file(text,text,text,bigint,text,text,text,bytea),checklist_lab.list_record_attachments(text,text,text,bigint),checklist_lab.read_record_attachment(text,text,text,bigint,text) to checklist_lab_operator;
