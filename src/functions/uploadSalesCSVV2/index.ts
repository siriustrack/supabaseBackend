import { supabase } from "../../config/supabaseClient";
import { RowData } from "../../models/RowData";
import { normalizeEmail, normalizePhone, normalizeDocument } from "../../utils/normalize";
import { resolveCustomerCluster } from "../../utils/cluster";

const DATABASE = "omni_sales";

function removeDuplicates(data: RowData[]): RowData[] {
  const seen = new Set();
  return data.filter((row) => {
    const key = `${row.transaction_code}-${row.product_id}-${row.offer_id}-${row.project_id}-${row.user_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function upsertV1(data: RowData[]) {
  return supabase.from(DATABASE).upsert(data, {
    onConflict: "transaction_code, product_id, offer_id, project_id, user_id",
    ignoreDuplicates: false,
  });
}

export async function uploadSalesCSVV2(req: any, res: any) {
  try {
    const csvChunk = await req.json();
    if (!Array.isArray(csvChunk)) {
      return new Response(
        JSON.stringify({ error: "O corpo da requisição deve ser um array de objetos" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    const batchedRows: RowData[] = [];
    for (const row of csvChunk) {
      const dateStr = typeof row.transaction_date === "string" ? row.transaction_date.trim() : "";
      const isISO = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
      const record: RowData = {
        id: crypto.randomUUID(),
        transaction_code: row.transaction_code,
        transaction_status: row.transaction_status,
        transaction_date: isISO ? dateStr : null,
        producer: row.producer,
        product_id: row.product_id,
        product_name: row.product_name,
        offer_id: row.offer_id,
        offer_name: row.offer_name,
        currency: row.currency,
        purchase_value_with_tax: parseFloat(row.purchase_value_with_tax),
        purchase_value_without_tax: parseFloat(row.purchase_value_without_tax),
        commission_currency: row.commission_currency,
        my_commission_value: parseFloat(row.my_commission_value),
        src_code: row.src_code,
        sck_code: row.sck_code,
        payment_method: row.payment_method,
        total_installments: parseInt(row.total_installments, 10),
        total_charges: parseInt(row.total_charges, 10),
        coupon_code: row.coupon_code,
        buyer_name: row.buyer_name,
        buyer_email: row.buyer_email,
        buyer_country: row.buyer_country,
        buyer_phone: row.buyer_phone,
        buyer_document: row.buyer_document,
        buyer_state: row.buyer_state,
        buyer_instagram: row.buyer_instagram,
        order_bump_type: row.order_bump_type,
        order_bump_transaction: row.order_bump_transaction,
        user_id: row.user_id,
        project_id: row.project_id,
        platform: row.platform,
      };
      batchedRows.push(record);
    }

    const uniqueData = removeDuplicates(batchedRows);

    // 1) Executa fluxo v1 (upsert base)
    await upsertV1(uniqueData);

    // 2) Resolver cluster e atualizar customer_hash via UPDATE
    for (const row of uniqueData) {
      const emailN = normalizeEmail(row.buyer_email);
      const phoneN = normalizePhone(row.buyer_phone);
      const docN = normalizeDocument(row.buyer_document);
      const clusterId = await resolveCustomerCluster({
        emailN,
        phoneN,
        docN,
        lastName: row.buyer_name ?? null,
      });
      if (!clusterId) continue;

      // localizar a(s) linhas recém upsertadas por chave idempotente
      await supabase
        .from(DATABASE)
        .update({ customer_hash: clusterId })
        .match({
          transaction_code: row.transaction_code,
          product_id: row.product_id,
          offer_id: row.offer_id,
          project_id: row.project_id,
          user_id: row.user_id,
        });
    }

    return new Response(JSON.stringify({ message: "Dados inseridos com sucesso (híbrido v2)" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
