-- Synthetic signatures only: not a full document parser or malware scan.
set role checklist_lab_operator;
with s as (select checklist_lab.record_source('c1','o1','p1') src),
p as (select src,jsonb_build_object('responsible','Operador A','note','','lines',(select jsonb_agg(jsonb_build_object('key',l->>'key','actual',l->'required','checked',l->>'required' is not null,'note','')) from jsonb_array_elements(src->'lines') l)) payload from s)
select checklist_lab.save_record_checklist('c1','o1','p1',src->'revisions',0,'attach-1',payload) from p;
do $test$
declare pdf bytea:=convert_to('%PDF-1.4 test fixture','UTF8'); png bytea:=decode('89504e470d0a1a0a01020304','hex'); jpg bytea:=decode('ffd8ff010203040506070809','hex'); webp bytea:=convert_to('RIFF1234WEBPtest','UTF8'); a jsonb;b jsonb;h text;before jsonb;
begin
 h:=encode(sha256(pdf),'hex'); before:=checklist_lab.read_record_checklist('c1','o1','p1',1);
 a:=checklist_lab.attach_record_file('c1','o1','p1',1,'folha.pdf','application/pdf',h,pdf);
 b:=checklist_lab.attach_record_file('c1','o1','p1',1,'folha.pdf','application/pdf',h,pdf);
 if a is distinct from b or a->>'private'<>'true' or jsonb_array_length(checklist_lab.list_record_attachments('c1','o1','p1',1))<>1 then raise exception 'attachment-replay';end if;
 if checklist_lab.read_record_attachment('c1','o1','p1',1,h) is distinct from pdf then raise exception 'attachment-readback';end if;
 if checklist_lab.read_record_attachment('c1','o1','p2',1,h) is not null then raise exception 'wrong-model-read';end if;
 begin perform checklist_lab.attach_record_file('c1','o1','p1',1,'renamed.pdf','application/pdf',h,pdf);raise exception 'changed-replay';exception when others then if sqlerrm<>'attachment-conflict' then raise;end if;end;
 begin perform checklist_lab.attach_record_file('c1','o1','p1',1,'fake.pdf','application/pdf',h,png);raise exception 'accepted-fake';exception when others then if sqlerrm<>'attachment-content-mismatch' then raise;end if;end;
 begin perform checklist_lab.attach_record_file('c1','o1','p1',1,'../folha.pdf','application/pdf',h,pdf);raise exception 'accepted-path';exception when others then if sqlerrm<>'attachment-input' then raise;end if;end;
 begin perform checklist_lab.attach_record_file('c1','o1','p2',1,'folha.pdf','application/pdf',h,pdf);raise exception 'wrong-model-write';exception when others then if sqlerrm<>'attachment-checklist-identity' then raise;end if;end;
 perform checklist_lab.attach_record_file('c1','o1','p1',1,'foto.png','image/png',encode(sha256(png),'hex'),png);
 perform checklist_lab.attach_record_file('c1','o1','p1',1,'foto.jpg','image/jpeg',encode(sha256(jpg),'hex'),jpg);
 begin perform checklist_lab.attach_record_file('c1','o1','p1',1,'foto.webp','image/webp',encode(sha256(webp),'hex'),webp);raise exception 'accepted-fourth';exception when others then if sqlerrm<>'attachment-limit' then raise;end if;end;
 if checklist_lab.read_record_checklist('c1','o1','p1',1) is distinct from before then raise exception 'checklist-altered';end if;
 begin perform count(*) from checklist_lab.record_attachments;raise exception 'direct-read';exception when insufficient_privilege then null;end;
end$test$;
reset role;
set role checklist_lab_denied;
do $test$ begin
 begin perform checklist_lab.list_record_attachments('c1','o1','p1',1);raise exception 'unauthorized-list';exception when insufficient_privilege then null;end;
 begin perform checklist_lab.read_record_attachment('c1','o1','p1',1,repeat('0',64));raise exception 'unauthorized-read';exception when insufficient_privilege then null;end;
 begin perform checklist_lab.attach_record_file('c1','o1','p1',1,'x.pdf','application/pdf',repeat('0',64),convert_to('%PDF-1.4 test','UTF8'));raise exception 'unauthorized-write';exception when insufficient_privilege then null;end;
end$test$;
reset role;
do $test$ begin
 if (select count(*) from checklist_lab.record_attachments)<>3 or (select progress from checklist_lab.official_separation where cut_id='cut-1')<>40 then raise exception 'attachment-count-or-writeoff';end if;
end$test$;
delete from checklist_lab.record_attachments;
delete from checklist_lab.record_history;
select 'PASS attachments exact version, byte hash, replay, private read, file limit and no writeoff' as result;
