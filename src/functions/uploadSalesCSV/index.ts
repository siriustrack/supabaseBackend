import { supabase } from "../../config/supabaseClient";
import { DateTime } from "luxon";
import { RowData } from "../../models/RowData";

const DATABASE = "omni_sales";

function removeDuplicates(data: RowData[]): RowData[] {
  const seen = new Set();
  return data.filter((row) => {
    const key = `${row.transaction_code}-${row.product_id}-${row.offer_id}-${row.project_id}-${row.user_id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function insertData(data: RowData[]) {
  console.log("Inserting data into the database...");

  if (!Array.isArray(data)) {
    console.error('O parâmetro "data" deve ser um array:', data);
    return;
  }

  // Remover duplicatas antes de inserir
  const uniqueData = removeDuplicates(data);

  try {
    const result = await supabase.from(DATABASE).upsert(uniqueData, {
      onConflict: "transaction_code, product_id, offer_id, project_id, user_id",
      ignoreDuplicates: false,
    });

    console.log("Data inserted successfully:", result);
  } catch (error) {
    console.error("Error inserting data:", error);
  }
}

export async function uploadSalesCSV(req: any, res: any) {
  try {
    const csvChunk = await req.json();

    console.log("Received CSV Chunk:", csvChunk);

    if (!Array.isArray(csvChunk)) {
      console.log("Invalid request body. Returning error response.");

      return new Response(
        JSON.stringify({
          error: "O corpo da requisição deve ser um array de objetos",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const batchedRows: RowData[] = [];

    for (const row of csvChunk) {
      const record: RowData = {
        id: crypto.randomUUID(),
        transaction_code: row.transaction_code,
        transaction_status: row.transaction_status,
        transaction_date: DateTime.fromFormat(
          row.transaction_date,
          "yyyy-MM-dd"
        ).isValid
          ? DateTime.fromFormat(row.transaction_date, "yyyy-MM-dd").toISODate()
          : null,
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

    console.log("Batched rows:", batchedRows);

    await insertData(batchedRows);

    console.log("Returning success response.");

    return new Response(
      JSON.stringify({ message: "Dados inseridos com sucesso" }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao processar a requisição:", error);

    console.log("Returning error response.");

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
