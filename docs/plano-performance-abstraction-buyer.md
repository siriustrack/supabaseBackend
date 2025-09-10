# Plano de ação para acelerar abstractionBuyer sem mudar contratos do front

## Objetivo e restrições
- Não mudar JSON de request/resposta nem a ordem de aplicação dos filtros no back.
- Mudar o mínimo possível no código existente.
- Suportar 200k+ registros atuais (e crescimento) com consultas rápidas e previsíveis.
- Stack atual: Supabase Postgres + Node/TypeScript.

## Visão geral
Gargalo atual: filtros por email/telefone/documento/nome percorrem muitas linhas de `omni_sales` (falta de chave canônica por cliente). Proposta: introduzir uma “camada de identidade” com um `customer_hash` (cluster de identidade) e usar esse hash para filtrar/agrupar de forma indexada, sem alterar o contrato das rotas.

A solução tem 3 peças principais:
1) Modelo de identidade do cliente e coluna nova `omni_sales.customer_hash` com índice.
2) Preenchimento do `customer_hash` na escrita (upload/inserção), com deduplicação/merge de identidades por email/telefone/documento.
3) Leitura otimizada: `abstractionBuyer` resolve o(s) `customer_hash` a partir dos filtros de comprador (quando houver) e filtra `omni_sales` diretamente por hash.

Complementos de baixo risco: índices adicionais e (opcional) materialized views para relatórios pesados.

---

## 1) Modelo de identidade do cliente
Em vez de apenas arrays, adotamos um modelo com tabela de “cluster” e tabela de “chaves do cluster”. É tão simples quanto arrays, porém muito mais eficiente para busca e merge de identidades (múltiplas chaves apontando para o mesmo cliente).

- customer_cluster
  - cluster_id UUID PK (hash/UUID do cliente)
  - last_buyer_email TEXT
  - last_buyer_phone TEXT
  - last_buyer_name TEXT
  - last_buyer_document TEXT
  - updated_at TIMESTAMPTZ DEFAULT now()

- customer_cluster_keys
  - key_type TEXT CHECK (key_type IN ('email','phone','document'))
  - key_value TEXT (normalizada; ver seção Normalização)
  - cluster_id UUID REFERENCES customer_cluster(cluster_id) ON DELETE CASCADE
  - UNIQUE (key_type, key_value)

- Alteração mínima em `omni_sales`:
  - Coluna nova: `customer_hash UUID NULL` (indexada)

- Índices
  - UNIQUE(idx): (key_type, key_value) em `customer_cluster_keys`
  - BTREE: `omni_sales(customer_hash)`
  - Recomendados (se ainda não existirem):
    - `omni_sales(created_at DESC)` para ordenação/paginação recentes
    - `omni_sales(shop_id, created_at DESC)` se multi-loja
    - `omni_sales(product_id)` e/ou `omni_sales(status)` conforme filtros mais comuns

### SQL de criação (Supabase/Postgres)
```sql
-- 1) Tabelas de identidade
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

-- 2) Coluna e índices em omni_sales
ALTER TABLE omni_sales ADD COLUMN IF NOT EXISTS customer_hash uuid;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_customer_hash ON omni_sales(customer_hash);
-- Exemplos adicionais (use os que fizerem sentido):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_created_at ON omni_sales(created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_shop_created ON omni_sales(shop_id, created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_product_id ON omni_sales(product_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_status ON omni_sales(status);
```

### Normalização (essencial para acurácia e cache hit)
- Email: lower-case, trim espaços.
- Telefone: apenas dígitos, aplique E.164 quando possível (ex.: mantenha DDI/DDD, remova caracteres não numéricos).
- Documento: apenas dígitos (remover pontos, traços, barras).

Crie helpers em TS e use-os tanto na escrita quanto em consultas de leitura.

---

## 2) Escrita/ingestão: preenchendo customer_hash
Objetivo: ao inserir uma venda, descobrir/gerar o `cluster_id` do comprador e preenchê-lo em `omni_sales.customer_hash`.

Regra de negócio ao inserir:
1) Normalize as chaves disponíveis: email, phone, document.
2) Busque em `customer_cluster_keys` se alguma dessas chaves já existe. Casos:
   - Encontrou 1 cluster: use-o.
   - Encontrou N>1 clusters (chaves pertencem a clusters diferentes): faça MERGE (junte clusters) escolhendo um cluster-alvo determinístico (ex.: o com menor `cluster_id`). Re-aponte as chaves do(s) outro(s) cluster(s) para o alvo e, em background, atualize `omni_sales.customer_hash` das vendas antigas do(s) cluster(s) absorvido(s).
   - Não encontrou cluster: crie um novo na `customer_cluster` e insira as chaves em `customer_cluster_keys`.
3) Faça upsert das chaves que ainda não existirem para o cluster resolvido.
4) Defina `omni_sales.customer_hash = cluster_id` antes do insert.
5) Atualize last_* no `customer_cluster` com os últimos dados não nulos.

Observação de implementação: para mínimo impacto, implemente essa lógica na camada Node (ex.: em `src/functions/uploadSalesCSV/index.ts`) antes de inserir em `omni_sales`. Alternativa: trigger BEFORE INSERT em Postgres (mais acoplado ao DB, porém menos mudança de código). Escolha 1 caminho e mantenha o outro como fallback futuro.

### Função SQL opcional para merge/upsert (PL/pgSQL simplificado)
```sql
CREATE OR REPLACE FUNCTION resolve_customer_cluster(p_email text, p_phone text, p_document text,
                                                    p_last_name text DEFAULT NULL,
                                                    p_last_email text DEFAULT NULL,
                                                    p_last_phone text DEFAULT NULL,
                                                    p_last_document text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  v_keys jsonb := jsonb_build_array();
  v_candidate_clusters uuid[] := '{}';
  v_cluster uuid;
  k text;
BEGIN
  -- Monte o array de chaves normalizadas (não nulas)
  IF p_email IS NOT NULL THEN v_keys := v_keys || jsonb_build_object('t','email','v',p_email); END IF;
  IF p_phone IS NOT NULL THEN v_keys := v_keys || jsonb_build_object('t','phone','v',p_phone); END IF;
  IF p_document IS NOT NULL THEN v_keys := v_keys || jsonb_build_object('t','document','v',p_document); END IF;

  -- Busque clusters candidatos
  SELECT array_agg(DISTINCT cluster_id)
    INTO v_candidate_clusters
    FROM customer_cluster_keys k
   WHERE (k.key_type = 'email' AND k.key_value = p_email)
      OR (k.key_type = 'phone' AND k.key_value = p_phone)
      OR (k.key_type = 'document' AND k.key_value = p_document);

  IF v_candidate_clusters IS NULL OR array_length(v_candidate_clusters,1) IS NULL THEN
    -- Nenhum cluster: crie
    INSERT INTO customer_cluster (last_buyer_name, last_buyer_email, last_buyer_phone, last_buyer_document)
    VALUES (p_last_name, p_last_email, p_last_phone, p_last_document)
    RETURNING cluster_id INTO v_cluster;
  ELSE
    -- Existe(m) cluster(s): escolha o menor UUID como alvo
    SELECT MIN(c) INTO v_cluster FROM unnest(v_candidate_clusters) c;

    -- Se mais de um, faça merge reatribuindo chaves (atualização de omni_sales pode ser job assíncrono)
    IF array_length(v_candidate_clusters,1) > 1 THEN
      UPDATE customer_cluster_keys
         SET cluster_id = v_cluster
       WHERE cluster_id <> v_cluster AND cluster_id = ANY(v_candidate_clusters);
      -- opcional: marcar para job de backfill de omni_sales.customer_hash
    END IF;

    -- Atualize last_* (sem sobrescrever com NULL)
    UPDATE customer_cluster
       SET last_buyer_name = COALESCE(p_last_name, last_buyer_name),
           last_buyer_email = COALESCE(p_last_email, last_buyer_email),
           last_buyer_phone = COALESCE(p_last_phone, last_buyer_phone),
           last_buyer_document = COALESCE(p_last_document, last_buyer_document),
           updated_at = now()
     WHERE cluster_id = v_cluster;
  END IF;

  -- Upsert chaves presentes
  IF p_email IS NOT NULL THEN
    INSERT INTO customer_cluster_keys (key_type, key_value, cluster_id)
    VALUES ('email', p_email, v_cluster)
    ON CONFLICT (key_type, key_value) DO UPDATE SET cluster_id = EXCLUDED.cluster_id;
  END IF;
  IF p_phone IS NOT NULL THEN
    INSERT INTO customer_cluster_keys (key_type, key_value, cluster_id)
    VALUES ('phone', p_phone, v_cluster)
    ON CONFLICT (key_type, key_value) DO UPDATE SET cluster_id = EXCLUDED.cluster_id;
  END IF;
  IF p_document IS NOT NULL THEN
    INSERT INTO customer_cluster_keys (key_type, key_value, cluster_id)
    VALUES ('document', p_document, v_cluster)
    ON CONFLICT (key_type, key_value) DO UPDATE SET cluster_id = EXCLUDED.cluster_id;
  END IF;

  RETURN v_cluster;
END;
$$ LANGUAGE plpgsql;
```

### Pseudocódigo (Node/TS) na inserção
```ts
// 1) normalizar
const emailN = normalizeEmail(row.email);
const phoneN = normalizePhone(row.phone);
const docN = normalizeDocument(row.document);

// 2) obter/merge cluster (via função SQL acima OU código TS consultando customer_cluster_keys)
const { data } = await sql`SELECT resolve_customer_cluster(${emailN}, ${phoneN}, ${docN}, ${row.name}, ${emailN}, ${phoneN}, ${docN}) AS cluster_id`;
const clusterId = data[0].cluster_id;

// 3) inserir em omni_sales com customer_hash
await db.insert('omni_sales', { ...row, customer_hash: clusterId });

// 4) (opcional) acionar rotina assíncrona de reconciliação/metrics
```

---

## 3) Leitura na abstractionBuyer (sem mudar JSON/ordem de filtros)
- Mantemos a mesma ordem e semântica de filtros. Otimizamos apenas o “como” filter é aplicado internamente.
- Quando o payload tiver filtros de comprador (email/phone/document/name):
  1) Normalize as chaves e resolva a(s) `cluster_id` consultando `customer_cluster_keys` (por key_type/key_value) e/ou, para nome, `customer_cluster.last_buyer_name ILIKE`.
  2) Adicione um filtro interno por `omni_sales.customer_hash IN (..cluster_ids..)`, mantendo os demais filtros exatamente como hoje e na mesma ordem.
  3) Se não houver filtros de comprador, nada muda: consultas seguem por índices usuais.

### Exemplo de resolução de hash no início do pipeline
```ts
let clusterIds: string[] | undefined;
if (filters.email || filters.phone || filters.document || filters.name) {
  const emailN = filters.email ? normalizeEmail(filters.email) : null;
  const phoneN = filters.phone ? normalizePhone(filters.phone) : null;
  const docN = filters.document ? normalizeDocument(filters.document) : null;

  clusterIds = await getClusterIds({ emailN, phoneN, docN, name: filters.name });
}

// depois, ao montar a query principal:
if (clusterIds?.length) {
  query = query.eq('customer_hash', clusterIds.length === 1 ? clusterIds[0] : undefined)
               .in('customer_hash', clusterIds.length > 1 ? clusterIds : undefined);
}
// manter os demais filtros na mesma ordem de hoje
```

<!-- Seção de cache removida por decisão de não usar Redis neste momento. -->

---

## 4) Backfill para 200k registros
Migração sem downtime:
1) Criar tabelas/índices/coluna (concurrently).
2) Script em lotes (ex.: 10k/50k por rodada) para:
   - Ler linhas de `omni_sales` sem `customer_hash`.
   - Normalizar chaves.
   - Resolver `cluster_id` (função SQL) e atualizar `omni_sales.customer_hash`.
3) Trocar a rota de escrita (upload) para já preencher `customer_hash` (passo pequeno no código TS).
4) Ativar uso de `customer_hash` na `abstractionBuyer` quando houver filtros de comprador (toggle de código). Manter fallback por alguns dias.
5) Monitorar p95/p99 e `EXPLAIN ANALYZE`; remover fallback quando estável.

Observações:
- Use transações pequenas por lote para reduzir lock/timeout.
- `CREATE INDEX CONCURRENTLY` para não bloquear escrita/leitura.
- Se ocorrer merge (múltiplos clusters), permita UPDATE assíncrono de `omni_sales.customer_hash` antigo em job de correção (idempotente).

---

## 5) Índices e query plan
- Certifique-se de que filtros frequentes tenham apoio de índices:
  - created_at DESC (paginação por recência ou keyset).
  - shop_id, product_id, status, payment_method, etc., conforme uso real.
- Prefira keyset pagination quando possível: `WHERE created_at < :cursor AND ... ORDER BY created_at DESC, id DESC LIMIT N`.
- Verifique `pg_stat_statements` e `EXPLAIN (ANALYZE, BUFFERS)` para confirmar uso de índices.

---

## 6) Riscos e mitigação
- Dados sujos (telefones com formatações diversas) → normalização consistente nas duas pontas.
- Merge de clusters e concorrência → escolha determinística do cluster-alvo e atualizações em pequenas transações; tarefa de reconciliação assíncrona para vendas antigas.
- Volume/tempo de backfill → rodar em lotes com pausas/limites, fora de horário de pico.
- Complexidade de trigger DB → começar pelo caminho de aplicação (TS) e deixar trigger como evolução futura.

---

## 7) Cronograma sugerido (curto e seguro)
- Dia 1: criar tabelas/índices/coluna; helpers de normalização; função SQL.
- Dia 2: ajustar upload para preencher `customer_hash`; script de backfill (lotes); métricas básicas.
- Dia 3: ativar leitura `abstractionBuyer` com resolução de hash; adicionar cache Redis; monitorar.
- Dia 4+: otimizações finas, índices adicionais conforme métricas; considerar materialized views para relatórios (ltv, rankings, etc.).

---

## 8) Próximos passos práticos no repo
- utils: adicionar normalizadores `normalizeEmail/Phone/Document`.
- uploadSalesCSV: antes do insert em `omni_sales`, resolver `cluster_id` e preencher `customer_hash`.
- abstractionBuyer: se houver filtros de comprador, resolver `clusterIds` e filtrar por `customer_hash` mantendo a ordem dos demais filtros.
- (sem cache): focar em índices, normalização e uso de `customer_hash`.

---

## 9) Operação híbrida (v1 + v2 lado a lado)
Para uma migração segura, manteremos versões v1 (legado) e v2 (com `customer_hash`) simultaneamente, sem mudar contratos.

- Endpoints duplicados (nomes exemplificativos; ajuste aos seus padrões):
  - v1 (inalterado):
    - POST `/uploadSalesCSV`
    - POST `/abstractionBuyer`
    - GET `/customerReport`
  - v2 (novos, mesmo payload e resposta):
    - POST `/uploadSalesCSV-v2`
    - POST `/abstractionBuyer-v2`
    - GET `/customerReport-v2` (pareado com `abstractionBuyer-v2`)

- Encadeamento no upload (v2):
  1) Receber o mesmo JSON do v1 e executar o fluxo atual (v1) normalmente para manter o comportamento e garantir a inserção base.
  2) Com base em uma chave idempotente do negócio (ex.: `external_id` + `shop_id` + `gateway`), localizar as linhas recém-inseridas.
  3) Executar a resolução de cluster (normalizar chaves, obter/mesclar `cluster_id`).
  4) Atualizar `omni_sales.customer_hash` via `UPDATE` nessas linhas (não reinserir), mantendo o dado de v1 intacto.

- abstractionBuyer-v2:
  - Mesmo contrato e mesma ordem de filtros.
  - Se houver filtros de comprador, resolve `clusterIds` e adiciona filtro por `customer_hash`; mantém os demais filtros e ordenação como hoje.

- customerReport-v2:
  - Internamente consulta `abstractionBuyer-v2` para montagem do relatório, preservando o contrato de saída.

- Validação e comparação:
  - Em rotas v2, coletar métricas p95/p99 e contagem de registros.
  - Opcional: em ambiente interno, comparar respostas entre v1 e v2 e registrar divergências em uma tabela de auditoria.

- Feature flag:
  - Usar variável de ambiente (ex.: `ABSTRACTION_V2_ENABLED`) para ativar v2 em produção gradualmente por rota.

---

## 10) SQL para rollout híbrido (criar clusters e alterar omni_sales)
Observações:
- `customer_hash` em `omni_sales` deve ser permissivo (NULL permitido, sem FK) durante a fase híbrida.
- Índices criados `CONCURRENTLY` para evitar bloqueios.

```sql
-- Extensão para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tabelas de identidade (clusters)
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

-- 2) Alterar omni_sales (sem constraint/obrigatoriedade no customer_hash)
ALTER TABLE omni_sales ADD COLUMN IF NOT EXISTS customer_hash uuid;

-- 3) Índices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_customer_hash ON omni_sales(customer_hash);
-- Índices recomendados (opcionais, habilite conforme uso real):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_created_at ON omni_sales(created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_shop_created ON omni_sales(shop_id, created_at DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_product_id ON omni_sales(product_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_omni_sales_status ON omni_sales(status);
```
- scripts: backfill em lotes (Node/TS simples chamando a função SQL/queries preparadas).

Resultado esperado: consultas de comprador deixam de escanear 200k linhas e passam a usar índice em `customer_hash`, reduzindo latência de segundos para dezenas de milissegundos nos casos comuns, sem mudanças no contrato de API e com alterações mínimas no código.
