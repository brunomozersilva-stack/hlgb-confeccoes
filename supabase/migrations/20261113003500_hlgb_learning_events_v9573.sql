-- HLGB v95.73: memória técnica do Auditor e do bot, independente do navegador.
-- Somente eventos técnicos sem payload de negócio. Append-only e isolado de hlgb_records/WAL.
CREATE TABLE IF NOT EXISTS public.hlgb_learning_events (
  event_id text PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('auditor','bot','fix')),
  fingerprint text NOT NULL,
  category text NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('observed','verified_fix','regression')),
  reference text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hlgb_learning_event_id_safe CHECK (event_id ~ '^evt-[a-z0-9-]{5,90}$'),
  CONSTRAINT hlgb_learning_fingerprint_safe CHECK (length(fingerprint) BETWEEN 3 AND 120),
  CONSTRAINT hlgb_learning_category_safe CHECK (length(category) BETWEEN 2 AND 80),
  CONSTRAINT hlgb_learning_reference_safe CHECK (length(reference) <= 140),
  CONSTRAINT hlgb_learning_evidence_safe CHECK (jsonb_typeof(evidence)='object' AND octet_length(evidence::text)<=4096)
);
CREATE INDEX IF NOT EXISTS hlgb_learning_fingerprint_idx ON public.hlgb_learning_events(fingerprint,created_at DESC);
CREATE INDEX IF NOT EXISTS hlgb_learning_source_idx ON public.hlgb_learning_events(source,created_at DESC);
ALTER TABLE public.hlgb_learning_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.hlgb_learning_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.hlgb_learning_events TO authenticated;
-- A mesma permissão de Auditor/Central de erros existente no ERP, nunca acesso anônimo.
CREATE POLICY hlgb_learning_read ON public.hlgb_learning_events
 FOR SELECT TO authenticated
 USING (public.hlgb_pode_ler_modulo('systemAuditRuns'));
CREATE POLICY hlgb_learning_append ON public.hlgb_learning_events
 FOR INSERT TO authenticated
 WITH CHECK (public.hlgb_pode_escrever_modulo('systemAuditRuns'));
