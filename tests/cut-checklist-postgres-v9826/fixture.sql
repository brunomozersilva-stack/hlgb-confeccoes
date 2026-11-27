-- Isolated fictional data. Never run in commercial database.
create role checklist_lab_operator nologin;
create role checklist_lab_denied nologin;
create schema checklist_lab;
revoke all on schema checklist_lab from public;
grant usage on schema checklist_lab to checklist_lab_operator,checklist_lab_denied;
create table checklist_lab.cut_source(cut_id text primary key,order_id text not null,product_id text not null,source_revision bigint not null,lines jsonb not null);
create table checklist_lab.official_separation(cut_id text primary key,progress integer not null);
insert into checklist_lab.cut_source values ('cut-1','order-1','model-1',1,'[{"key":"elastico:preto","color":"Preto","required":96,"unit":"m"},{"key":"elastico:branco","color":"Branco","required":48,"unit":"m"},{"key":"elastico:rubi","color":"Rubi","required":96,"unit":"m"},{"key":"tule:preto","color":"Preto","required":null,"unit":"m"}]');
insert into checklist_lab.official_separation values ('cut-1',40);
grant select on checklist_lab.cut_source to checklist_lab_operator;
