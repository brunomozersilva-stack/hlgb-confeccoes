-- Isolated gateway identity simulation. Production MUST use verified auth.uid(), not SET ROLE/GUC.
create role checklist_lab_operator2 nologin;
create role checklist_lab_revoked nologin;
grant usage on schema checklist_lab to checklist_lab_operator2,checklist_lab_revoked;
create table checklist_lab.user_access(role_name text primary key,active boolean not null,access jsonb not null);
insert into checklist_lab.user_access values
('checklist_lab_operator',true,'["corte","pedidos","produtos","materiais"]'),
('checklist_lab_operator2',true,'["corte","pedidos","produtos","materiais"]'),
('checklist_lab_revoked',false,'["corte","pedidos","produtos","materiais"]');
alter table checklist_lab.user_access enable row level security;
grant select on checklist_lab.user_access to checklist_lab_writer;
create policy access_writer_read on checklist_lab.user_access for select to checklist_lab_writer using(true);
create function checklist_lab.authorized() returns boolean language sql stable security definer set search_path='' as $auth$
 select exists(select 1 from checklist_lab.user_access u where u.role_name=current_setting('role',true) and u.active and u.access ?& array['corte','pedidos','produtos','materiais']);
$auth$;
grant create on schema checklist_lab to checklist_lab_writer;
alter function checklist_lab.authorized() owner to checklist_lab_writer;
revoke create on schema checklist_lab from checklist_lab_writer;
revoke all on function checklist_lab.authorized() from public;
grant execute on function checklist_lab.authorized() to checklist_lab_writer,checklist_lab_operator,checklist_lab_operator2,checklist_lab_revoked;
