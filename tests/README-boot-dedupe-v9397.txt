HLGB Auditor Boot + Dedupe v93.97

Escopo desta rodada:
- bloquear hlgbLoadNormalizedCore antes de __HLGB_AUTH_READY;
- bloquear hlgbRecordLoadBundle antes de __HLGB_AUTH_READY;
- bloquear syncFinalizedCutsToProduction antes de __HLGB_AUTH_READY;
- manter delegacao normal depois do login;
- impedir duas tags simultaneas da autoridade WAL v93.48;
- aguardar o parser antes de injetar o guard confiavel da folha;
- expor no Auditor quantas chamadas pre-login foram bloqueadas com seguranca.

Fora do escopo:
- consolidacao da cadeia hlgbRecordSaveWithRetry (permanece alerta real para rodada propria);
- alteracao de dados de negocio;
- Supabase schema/RLS;
- criacao de nova camada de save/WAL.
