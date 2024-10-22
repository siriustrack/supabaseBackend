import { supabase } from "../../config/supabaseClient";
import { getSelectionString } from "../../utils/getSelectionString";
import { fillingInBuyerData } from "./fillingInBuyerData";
import { TransactionData } from "../../models/TransactionData";
import { BuyerData } from "../../models/BuyerData";
import redisClient from "../../config/redisClient"; // Importa o Redis
import { createHash } from "crypto"; // Para criar hash do corpo da requisição

export type ConditionType = "OU" | "E";

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

  // Gera uma chave de cache única com base no projectId, userId e hash do corpo
  const cacheKey = `${projectId}_${userId}_${createHash("md5")
    .update(JSON.stringify(requestData))
    .digest("hex")}`;

  // Verifica se o resultado está no cache
  const cachedResult = await redisClient.get(cacheKey);

  if (cachedResult) {
    console.log(`Cache hit para a chave ${cacheKey}`);
    return JSON.parse(cachedResult); // Retorna o resultado cacheado
  }

  console.log(`Cache miss para a chave ${cacheKey}, processando...`);

  // Aqui faz a lógica de abstração como antes...
  const result = await processAbstraction(
    requestData,
    asc,
    includeCurrencyFilter
  ); // Função que contém o resto da lógica

  // Verifica a quantidade de vendas para garantir que o cache seja válido
  const query = supabase
    .from("omni_sales")
    .select("id", { count: "exact" })
    .eq("project_id", projectId)
    .eq("user_id", userId);

  const { count } = await query;

  if (count !== null) {
    // Salva o resultado no cache sem expiração ou com expiração de 30 dias (em segundos)
    const cacheDuration = 30 * 24 * 60 * 60; // 30 dias em segundos

    await redisClient.set(cacheKey, JSON.stringify(result), {
      EX: cacheDuration, // Remove esta linha para cache sem expiração
    });
  }

  return result;
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
    console.log("buyerData:");
    console.log(buyersData);
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
