-- REVIEW ONLY: not a deployed migration. Test in isolated HLGB homologation first.
-- No changes to hlgb_records, WAL, orders, payroll or financial titles.
begin;
create table public.hlgb_production_forecast_journal (
  seq bigint generated always as identity primary key,
  lot_id text not null check (length(lot_id) between 1 and 128),
  captured_on date not null default (timezone('America/Sao_Paulo', statement_timestamp())::date),
  captured_at timestamptz not null default statement_timestamp(),
  captured_by uuid not null default auth.uid(),
  forecast jsonb not null,
  unique(lot_id,captured_on),
  check (jsonb_typeof(forecast) = 'object' and octet_length(forecast::text) <= 262144),
  check ((forecast->>'version' = '1' and forecast->>'lotId' = lot_id
      and forecast->>'capturedAt' = captured_on::text
      and length(forecast->>'productId') between 1 and 128
      and length(forecast->>'teamId') between 1 and 128
      and jsonb_typeof(forecast->'training') = 'array') is true)
);
alter table public.hlgb_production_forecast_journal enable row level security;
revoke all on public.hlgb_production_forecast_journal from public, anon, authenticated;
grant select on public.hlgb_production_forecast_journal to authenticated;
grant insert(lot_id,forecast) on public.hlgb_production_forecast_journal to authenticated;
-- Existing HLGB permission checks resolve active users using the application access table.
-- Require the same four areas as the Central, on the server, not only in the browser.
create policy forecast_journal_select on public.hlgb_production_forecast_journal
  for select to authenticated using (
    (select auth.uid()) is not null
    and (select public.hlgb_pode_escrever_modulo('orders'))
    and (select public.hlgb_pode_escrever_modulo('production'))
    and (select public.hlgb_pode_escrever_modulo('finance'))
    and (select public.hlgb_pode_escrever_modulo('projectionInvoices'))
  );
create policy forecast_journal_insert on public.hlgb_production_forecast_journal
  for insert to authenticated with check (
    captured_by = (select auth.uid())
    and captured_on = timezone('America/Sao_Paulo', statement_timestamp())::date
    and captured_at = statement_timestamp()
    and (select public.hlgb_pode_escrever_modulo('orders'))
    and (select public.hlgb_pode_escrever_modulo('production'))
    and (select public.hlgb_pode_escrever_modulo('finance'))
    and (select public.hlgb_pode_escrever_modulo('projectionInvoices'))
  );
-- Intentionally no update/delete policies or grants. No anonymous access.
-- Captured metadata authenticates the submission, not correctness of underlying history.
commit;
