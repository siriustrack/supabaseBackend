## Executado

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customer_cluster (
  cluster_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_buyer_email text,
  last_buyer_phone text,
  last_buyer_name text,
  last_buyer_document text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_cluster_keys (
  key_type text NOT NULL CHECK (key_type IN ('email','phone','document')),
  key_value text NOT NULL,
  cluster_id uuid NOT NULL REFERENCES customer_cluster(cluster_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key_type, key_value)
);

ALTER TABLE omni_sales ADD COLUMN IF NOT EXISTS customer_hash uuid;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_customer_hash ON omni_sales(customer_hash);

## A Fazer (referências ao plano: docs/plano-performance-abstraction-buyer.md)

- [§1, §3, §8] Normalização/Helpers
  - Criar utils: `normalizeEmail`, `normalizePhone`, `normalizeDocument`.
  - Aplicar normalização em upload (v1/v2) e em `abstractionBuyer` (v1/v2).

- [§2] Função SQL de resolução de cluster
  - Criar a função `resolve_customer_cluster(...)` (PL/pgSQL) conforme plano.
  - Cobrir cenários: novo cluster, match único, merge multi-cluster (teste prático).

- [§9] Upload híbrido (uploadSalesCSV-v2)
  - Duplicar endpoint POST `/uploadSalesCSV-v2` (mesmo contrato do v1).
  - Executar primeiro o fluxo atual (v1) e persistir registros.
  - Identificar linhas via chave idempotente (ex.: `external_id` + `shop_id` + `gateway`).
  - Invocar `resolve_customer_cluster` e atualizar `omni_sales.customer_hash` via UPDATE.
  - Registrar métricas básicas (contagem atualizada, tempo por lote).

- [§3, §9] AbstractionBuyer-v2
  - Duplicar endpoint POST `/abstractionBuyer-v2` (mesmo contrato e ordem de filtros).
  - Se houver filtros de comprador: resolver `clusterIds` por `customer_cluster_keys` e filtrar `omni_sales` por `customer_hash`.
  - Manter ordenação/paginação e demais filtros exatamente como v1.
  - Validar query plan (dev) com EXPLAIN.

- [§9] customerReport-v2
  - Duplicar GET `/customerReport-v2`, consumindo `abstractionBuyer-v2`.
  - Comparar com v1 e registrar divergências (tabela de auditoria opcional).

- [§4] Backfill em lotes
  - Implementar script Node/TS para processar `omni_sales` sem `customer_hash` em lotes (10k/50k).
  - Normalizar chaves, chamar `resolve_customer_cluster`, atualizar `customer_hash`.
  - Transações pequenas, idempotência, execução fora de pico e logs de progresso.

- [§5] Índices e query plan
  - Confirmar/criar índices úteis: `created_at DESC`, `shop_id+created_at`, `product_id`, `status` (conforme uso real).
  - Medir com `pg_stat_statements` e `EXPLAIN (ANALYZE, BUFFERS)`; considerar keyset pagination.

- [§9] Feature flag e rollout
  - Adicionar `ABSTRACTION_V2_ENABLED` para ativação por rota.
  - Monitorar p95/p99 v1 vs v2; definir rollback simples (desativar flag).

- [§2, §4, §6] Reconciliação e merges
  - Criar job assíncrono para atualizar `omni_sales.customer_hash` após merges de clusters antigos.
  - Testar concorrência (inserções simultâneas e merges).

- [§7, §10] Testes e validação
  - Testes unitários: normalizadores e `resolve_customer_cluster`.
  - Testes de integração: `/uploadSalesCSV-v2`, `/abstractionBuyer-v2`, `/customerReport-v2`.
  - Carga amostra para medir latência e confirmar uso de índice em `customer_hash`.

- [§8] Documentação interna
  - Documentar endpoints v2 e o fluxo híbrido.
  - Notas de migração/backfill e instruções de verificação (checklist de promoção v2).
```