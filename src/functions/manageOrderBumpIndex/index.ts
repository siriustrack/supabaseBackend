import { supabase } from "../../config/supabaseClient";

interface RequestData {
  projectId: string;
  userId: string;
  productName?: string;
  productId?: string;
  offersIds?: string[];
  condition?: "add" | "delete";
}

interface OrderBumpIndexTable {
  id: string;
  project_id: string;
  user_id: string;
  product_id: string;
  offers_ids: string[] | null;
}

interface ErrorResponse {
  error: string;
}

// Função principal para lidar com a requisição
export async function manageOrderBumpIndex(
  req: any,
  res: any
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    if (req.method === "GET") {
      const userId = params.get("userId");
      const projectId = params.get("projectId");

      if (!userId || !projectId) {
        throw new Error(
          "Os parâmetros 'userId' e 'projectId' são obrigatórios."
        );
      }

      const { data, error } = await supabase
        .from("order_bump_index")
        .select("*")
        .eq("user_id", userId)
        .eq("project_id", projectId);

      if (error) {
        throw new Error(error.message);
      }

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else if (req.method === "POST") {
      const rawRequestData = await req.text();
      console.log("Raw Request Data:", rawRequestData);
      const requestData: RequestData = JSON.parse(rawRequestData);

      const {
        projectId,
        userId,
        productId,
        offersIds,
        productName,
        condition,
      } = requestData;

      if (!projectId) {
        throw new Error("O parâmetro 'project_id' é obrigatório.");
      }

      if (!userId) {
        throw new Error("O parâmetro 'user_id' é obrigatório.");
      }

      if (!productId) {
        throw new Error("O parâmetro 'product_id' é obrigatório.");
      }

      let result;
      if (condition === "add") {
        result = await supabase.from("order_bump_index").upsert(
          {
            project_id: projectId,
            user_id: userId,
            product_name: productName,
            product_id: productId,
            offers_ids: offersIds || null,
          },
          {
            onConflict: "project_id, user_id, product_id",
            ignoreDuplicates: false,
          }
        );

        if (result.error) {
          throw new Error(result.error.message);
        }

        // Atualizar omni_sales
        let updateQuery = supabase
          .from("omni_sales")
          .update({ order_bump_index: "Child" })
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .eq("product_id", productId);

        if (offersIds && offersIds.length > 0) {
          updateQuery = updateQuery.in("offer_id", offersIds);
        }

        const updateResult = await updateQuery;

        if (updateResult.error) {
          throw new Error(updateResult.error.message);
        }
      } else if (condition === "delete") {
        result = await supabase
          .from("order_bump_index")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .eq("product_id", productId);

        if (result.error) {
          throw new Error(result.error.message);
        }

        // Atualizar omni_sales para null quando deletar
        let updateQuery = supabase
          .from("omni_sales")
          .update({ order_bump_index: null })
          .eq("project_id", projectId)
          .eq("user_id", userId)
          .eq("product_id", productId);

        if (offersIds && offersIds.length > 0) {
          updateQuery = updateQuery.in("offer_id", offersIds);
        }

        const updateResult = await updateQuery;

        if (updateResult.error) {
          throw new Error(updateResult.error.message);
        }
      } else {
        throw new Error("O parâmetro 'condition' é inválido.");
      }

      const response = result.data;

      // Usando res.json para retornar a resposta ao cliente
      return res.status(200).json(response);
    }
  } catch (error) {
    console.error("Erro ao processar customerReport:", error);

    // Usando res.json para retornar um erro
    return res.status(500).json({
      error: error.message || "Ocorreu um erro desconhecido",
    });
  }
}
