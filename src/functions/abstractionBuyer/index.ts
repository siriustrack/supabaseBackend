import { supabase } from "../../config/supabaseClient";
import { getSelectionString } from "../../utils/getSelectionString";
import { fillingInBuyerData } from "./fillingInBuyerData";
import { TransactionData } from "../../models/TransactionData";
import { BuyerData } from "../../models/BuyerData";
import { redisClient } from "../../config/redisClient"; // Importa o Redis
import { createHash } from "crypto"; // Para criar hash do corpo da requisição

export type ConditionType = "OU" | "E";

// Mapa de promessas em andamento
const promisePool: { [key: string]: Promise<any> } = {};

// Função auxiliar para verificar o `count` atual das vendas no Supabase
async function getSalesCount(
  projectId: string,
  userId: string
): Promise<number | null> {
  const query = supabase
    .from("omni_sales")
    .select("id", { count: "exact" })
    .eq("project_id", projectId)
    .eq("user_id", userId);

  const { count } = await query;
  return count;
}

export async function abstraction({
  req,
  asc = true,
  includeCurrencyFilter = true,
}: {
  req: any;
  asc?: boolean;
  includeCurrencyFilter?: boolean;
}) {
  if (req.method !== "POST") {
    throw new Error("Método de requisição inválido. Apenas POST é permitido.");
  }

  const requestData = req.body;
  const { projectId, userId } = requestData;

  console.log(
    `Iniciando requisição para projectId: ${projectId}, userId: ${userId}`
  );

  // Gera uma chave de cache única com base no projectId, userId e hash do corpo
  const cacheKey = `${projectId}_${userId}_${createHash("md5")
    .update(JSON.stringify(requestData))
    .digest("hex")}`;

  console.log(`Chave de cache gerada: ${cacheKey}`);

  // Verifica se já existe uma promessa em andamento para essa chave
  if (promisePool[cacheKey]) {
    console.log(
      `Requisição já em andamento para a chave ${cacheKey}. Retornando a Promise existente.`
    );
    return promisePool[cacheKey]; // Retorna a Promise em andamento
  }

  // Verifica se o resultado já está no cache
  const cachedResult = await redisClient.get(cacheKey);

  if (cachedResult) {
    console.log(`Cache encontrado para a chave ${cacheKey}`);

    // Verifica a quantidade de vendas atual para garantir que o cache é válido
    const currentSalesCount = await getSalesCount(projectId, userId);
    const cachedData = JSON.parse(cachedResult);

    if (cachedData.count === currentSalesCount) {
      console.log(
        `Cache válido para a chave ${cacheKey}. Retornando dados do cache.`
      );
      return cachedData.result; // Serve o cache se o `count` bater
    } else {
      console.log(
        `Cache inválido para a chave ${cacheKey} (count diferente). Ignorando cache.`
      );
    }
  } else {
    console.log(`Nenhum cache encontrado para a chave ${cacheKey}.`);
  }

  // Se não tem cache válido ou se a requisição é nova, cria uma nova promessa e a salva no pool
  console.log(
    `Cache miss ou cache inválido para a chave ${cacheKey}, processando a requisição...`
  );

  promisePool[cacheKey] = (async () => {
    console.log(`Requisição adicionada ao pool de promessas: ${cacheKey}`);
    try {
      // Processa a abstração
      const result = await processAbstraction(
        requestData,
        asc,
        includeCurrencyFilter
      );

      // Verifica se o resultado é válido (não nulo, indefinido ou vazio)
      if (!result || Object.keys(result).length === 0) {
        console.log(`Resultado inválido ou vazio. Não salvando no cache.`);
        return result; // Retorna o resultado, mesmo que seja vazio, sem salvar no cache
      }

      // Verifica a quantidade de vendas para garantir que o cache seja válido
      const currentSalesCount = await getSalesCount(projectId, userId);

      if (currentSalesCount !== null) {
        console.log(`Salvando resultado no cache para a chave ${cacheKey}`);

        // Salva o resultado no cache com o `count` atual para futuras verificações
        const cacheData = {
          count: currentSalesCount,
          result: result,
        };

        const cacheDuration = 30 * 24 * 60 * 60; // 30 dias em segundos
        await redisClient.set(cacheKey, JSON.stringify(cacheData), {
          EX: cacheDuration,
        });

        console.log(`Resultado salvo no cache por ${cacheDuration} segundos.`);
      } else {
        console.log(
          `Não foi possível obter o count atual de vendas. Cache não salvo.`
        );
      }

      return result;
    } finally {
      console.log(
        `Requisição finalizada. Removendo promessa do pool: ${cacheKey}`
      );
      // Remove a promessa do pool ao final
      delete promisePool[cacheKey];
    }
  })();

  // Retorna a promessa que será resolvida futuramente
  console.log(
    `Retornando a Promise da requisição em andamento para a chave ${cacheKey}`
  );
  return promisePool[cacheKey];
}

async function processAbstraction(requestData, asc, includeCurrencyFilter) {
  try {
    const {
      startDate,
      endDate,
      currencyReq,
      projectId,
      userId,
      firstBuyProductIds,
      firstBuyStartDate,
      firstBuyOfferIds,
      firstBuyEndDate,
      maxDaysWoBuy,
      minDaysWoBuy,
      maxLTV,
      minLTV,
      limitPlan,
      remProductIds,
      remOfferIds,
      containProductIds,
      containOfferIds,
      sourceSrcs,
      sourceScks,
      conditionContainProductIds,
      conditionContainOfferIds,
      conditionRemProductIds,
      conditionRemOfferIds,
      minTransactions,
      maxTransactions,
      page,
      limit,
      orderKey,
      orderDirection,
    } = requestData;

    console.log(`Request: ${JSON.stringify(requestData)}`);

    //const validatedlimitPlan = limitPlan || "infinite";
    const validatedmaxDaysWoBuy: number | null = maxDaysWoBuy;
    const validatedminDaysWoBuy: number | null = minDaysWoBuy;
    const validatedmaxTransactions: number | null = maxTransactions;
    const validatedminTransactions: number | null = minTransactions;
    const validatedmaxLTV: number | null = maxLTV;
    const validatedminLTV: number | null = minLTV;
    const validatedContainProductIds: string[] = containProductIds
      ? containProductIds
      : [];
    const validatedContainOfferIds: string[] = containOfferIds
      ? containOfferIds
      : [];
    const validatedFirstBuyProductIds: string[] = firstBuyProductIds
      ? firstBuyProductIds
      : [];
    const validatedFirstBuyOfferIds: string[] = firstBuyOfferIds
      ? firstBuyOfferIds
      : [];
    const validatedFirstBuyStartDate: string =
      firstBuyStartDate === "null" || !firstBuyStartDate
        ? ""
        : firstBuyStartDate;
    const validatedFirstBuyEndDate: string =
      firstBuyEndDate === "null" || !firstBuyEndDate ? "" : firstBuyEndDate;
    const currency: string =
      currencyReq === "null" || !currencyReq ? "BRL" : currencyReq;

    const validatedConditionContainProductIds: ConditionType =
      conditionContainProductIds === "null" || !conditionContainProductIds
        ? "OU"
        : conditionContainProductIds;
    const validatedConditionContainOfferIds: ConditionType =
      conditionContainOfferIds === "null" || !conditionContainOfferIds
        ? "OU"
        : conditionContainOfferIds;
    const validatedConditionRemProductIds: ConditionType =
      conditionRemProductIds === "null" || !conditionRemProductIds
        ? "OU"
        : conditionRemProductIds;
    const validatedConditionRemOfferIds: ConditionType =
      conditionRemOfferIds === "null" || !conditionRemOfferIds
        ? "OU"
        : conditionRemOfferIds;

    const validatedRemProductIds: string[] = remProductIds ? remProductIds : [];
    const validatedRemOfferIds: string[] = remOfferIds ? remOfferIds : [];

    const selectionString = getSelectionString();

    if (!projectId) {
      throw new Error("O parâmetro 'project_id' é obrigatório.");
    }

    if (!userId) {
      throw new Error("O parâmetro 'user_id' é obrigatório.");
    }

    const database = "omni_sales";
    let pageDB = 0;
    const pageSize = 10000; // Tamanho do lote
    let allData: TransactionData[] = [];

    while (true) {
      let query = supabase
        .from(database)
        .select(selectionString)
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .order("transaction_date", { ascending: asc })
        .range(pageDB * pageSize, (pageDB + 1) * pageSize - 1); // Paginação

      if (includeCurrencyFilter && currency !== "DESCONSIDERAR MOEDA") {
        query = query.eq("currency", currency);
      }
      if (Array.isArray(sourceSrcs) && sourceSrcs.length > 0) {
        query = query.in("src_code", sourceSrcs);
      }
      if (Array.isArray(sourceScks) && sourceScks.length > 0) {
        query = query.in("sck_code", sourceScks);
      }
      if (startDate && !isNaN(new Date(startDate).getTime())) {
        query = query.gte("transaction_date", startDate);
      }
      if (endDate && !isNaN(new Date(endDate).getTime())) {
        query = query.lte("transaction_date", endDate);
      }
      // if (validatedlimitPlan !== "infinite") {
      //   const limitValue = parseInt(validatedlimitPlan, 10);

      //   if (!isNaN(limitValue)) {
      //     query = query.limit(limitValue);
      //   }
      // }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break; // Termina o loop quando não há mais dados
      }

      const specifiedData = data as unknown as TransactionData[]; // Mantendo a tipagem
      allData = allData.concat(specifiedData); // Acumula os dados extraídos

      pageDB++; // Incrementa a página para o próximo lote
    }

    const buyersData: {
      [email: string]: BuyerData;
    } = {};
    //console.log("buyerData:");
    console.log("Entrando em fillingInBuyerData");
    const filteredBuyersData = fillingInBuyerData({
      specifiedData: allData,
      buyersData,
      validatedFirstBuyStartDate,
      validatedFirstBuyEndDate,
      validatedmaxDaysWoBuy,
      validatedminDaysWoBuy,
      validatedmaxLTV,
      validatedminLTV,
      validatedFirstBuyProductIds,
      remOfferIds: validatedRemOfferIds,
      remProductIds: validatedRemProductIds,
      validatedContainProductIds,
      validatedContainOfferIds,
      validatedFirstBuyOfferIds,
      validatedConditionContainProductIds,
      validatedConditionContainOfferIds,
      validatedConditionRemProductIds,
      validatedConditionRemOfferIds,
      validatedmaxTransactions,
      validatedminTransactions,
    });

    return {
      filteredBuyersData,
      page,
      limit,
      orderKey,
      orderDirection,
    };
  } catch (error) {
    throw error;
  }
}
