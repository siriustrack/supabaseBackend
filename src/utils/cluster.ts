import { supabase } from "../config/supabaseClient";

export async function resolveCustomerCluster(params: {
  emailN: string | null;
  phoneN: string | null;
  docN: string | null;
  lastName?: string | null;
}): Promise<string | null> {
  const { emailN, phoneN, docN, lastName } = params;
  
  console.log("🔍 resolveCustomerCluster chamado com:", { emailN, phoneN, docN, lastName });

  // Try SQL function if exists
  try {
    console.log("🔧 Tentando RPC resolve_customer_cluster...");
    const { data, error } = await supabase.rpc("resolve_customer_cluster", {
      p_email: emailN,
      p_phone: phoneN,
      p_document: docN,
      p_last_name: lastName ?? null,
      p_last_email: emailN,
      p_last_phone: phoneN,
      p_last_document: docN,
    });

    if (error) {
      console.log("⚠️ RPC resolve_customer_cluster falhou:", error.message, "- usando fallback");
    } else if (data) {
      console.log("✅ RPC retornou cluster:", data);
      return data as unknown as string;
    }
  } catch (rpcErr) {
    console.log("⚠️ RPC resolve_customer_cluster erro:", rpcErr, "- usando fallback");
  }

  // Fallback: look for any key in customer_cluster_keys
  try {
    console.log("🔄 Usando fallback: buscar/criar clusters nas tabelas...");
    
    const filters: { key_type: "email" | "phone" | "document"; key_value: string }[] = [];
    if (emailN) filters.push({ key_type: "email", key_value: emailN });
    if (phoneN) filters.push({ key_type: "phone", key_value: phoneN });
    if (docN) filters.push({ key_type: "document", key_value: docN });

    if (!filters.length) {
      console.log("❌ Nenhuma chave válida para buscar cluster");
      return null;
    }

    // 1) Buscar clusters existentes para qualquer uma das chaves
    console.log("🔎 Buscando clusters existentes para", filters.length, "chaves");
    const clusterIds = new Set<string>();
    for (const f of filters) {
      const { data, error } = await supabase
        .from("customer_cluster_keys")
        .select("cluster_id")
        .eq("key_type", f.key_type)
        .eq("key_value", f.key_value);
      
      if (error) {
        console.error("❌ Erro ao buscar cluster_keys:", error);
        continue;
      }
      
      (data || []).forEach((r: any) => {
        console.log(`🔗 Encontrado cluster ${r.cluster_id} para ${f.key_type}=${f.key_value}`);
        clusterIds.add(r.cluster_id);
      });
    }

    let targetCluster: string | null = null;

    if (clusterIds.size === 0) {
      // 2) Nenhum cluster: criar novo
      console.log("🆕 Nenhum cluster encontrado, criando novo...");
      const { data: created, error: createErr } = await supabase
        .from("customer_cluster")
        .insert([
          {
            last_buyer_name: lastName ?? null,
            last_buyer_email: emailN ?? null,
            last_buyer_phone: phoneN ?? null,
            last_buyer_document: docN ?? null,
          },
        ])
        .select("cluster_id")
        .single();
      if (createErr || !created) {
        console.error("❌ Erro ao criar cluster:", createErr);
        return null;
      }
      targetCluster = (created as any).cluster_id as string;
      console.log("✅ Cluster criado:", targetCluster);

      // Upsert chaves para o cluster
      const keysToUpsert = filters.map((f) => ({
        key_type: f.key_type,
        key_value: f.key_value,
        cluster_id: targetCluster!,
      }));
      console.log("🔑 Inserindo", keysToUpsert.length, "chaves para o cluster");
      const { error: keysErr } = await supabase
        .from("customer_cluster_keys")
        .upsert(keysToUpsert, { onConflict: "key_type,key_value" });
      if (keysErr) {
        console.error("❌ Erro ao inserir chaves:", keysErr);
      } else {
        console.log("✅ Chaves inseridas com sucesso");
      }
    } else {
      // 3) Existe(m) cluster(s): escolher determinístico e, se necessário, merge
      const ids = Array.from(clusterIds).sort();
      targetCluster = ids[0];
      const others = ids.slice(1);
      if (others.length > 0) {
        // Reapontar chaves de outros clusters para o alvo
        await supabase
          .from("customer_cluster_keys")
          .update({ cluster_id: targetCluster })
          .in("cluster_id", others);
        // Observação: atualização de omni_sales.customer_hash de históricos pode ser feita por job assíncrono
      }

      // Atualizar last_* sem sobrescrever com nulos
      await supabase
        .from("customer_cluster")
        .update({
          last_buyer_name: lastName ?? undefined,
          last_buyer_email: emailN ?? undefined,
          last_buyer_phone: phoneN ?? undefined,
          last_buyer_document: docN ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("cluster_id", targetCluster);

      // Garantir que chaves atuais existam no cluster alvo
      const keysToUpsert = filters.map((f) => ({
        key_type: f.key_type,
        key_value: f.key_value,
        cluster_id: targetCluster!,
      }));
      await supabase
        .from("customer_cluster_keys")
        .upsert(keysToUpsert, { onConflict: "key_type,key_value" });
    }

    return targetCluster;
  } catch (fallbackErr) {
    console.error("❌ Erro no fallback de cluster:", fallbackErr);
    return null;
  }
}

export async function getClusterIdsByFilters(params: {
  emailN?: string | null;
  phoneN?: string | null;
  docN?: string | null;
  name?: string | null;
}): Promise<string[]> {
  const { emailN, phoneN, docN, name } = params;
  const clusterIds = new Set<string>();

  if (emailN) {
    const { data } = await supabase
      .from("customer_cluster_keys")
      .select("cluster_id")
      .eq("key_type", "email")
      .eq("key_value", emailN);
    (data || []).forEach((r: any) => clusterIds.add(r.cluster_id));
  }
  if (phoneN) {
    const { data } = await supabase
      .from("customer_cluster_keys")
      .select("cluster_id")
      .eq("key_type", "phone")
      .eq("key_value", phoneN);
    (data || []).forEach((r: any) => clusterIds.add(r.cluster_id));
  }
  if (docN) {
    const { data } = await supabase
      .from("customer_cluster_keys")
      .select("cluster_id")
      .eq("key_type", "document")
      .eq("key_value", docN);
    (data || []).forEach((r: any) => clusterIds.add(r.cluster_id));
  }
  if (name) {
    const { data } = await supabase
      .from("customer_cluster")
      .select("cluster_id")
      .ilike("last_buyer_name", `%${name}%`);
    (data || []).forEach((r: any) => clusterIds.add(r.cluster_id));
  }

  return Array.from(clusterIds);
}
