import { supabase } from "../../config/supabaseClient";
import { getSelectionString } from "../../utils/getSelectionString";
import { fillingInBuyerData } from "../abstractionBuyer/fillingInBuyerData";
import { TransactionData } from "../../models/TransactionData";
import { BuyerData } from "../../models/BuyerData";
import { normalizeEmail, normalizePhone, normalizeDocument } from "../../utils/normalize";
import { getClusterIdsByFilters } from "../../utils/cluster";

export type ConditionType = "OU" | "E";

export async function abstractionV2({
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

  const {
    startDate,
    endDate,
    currencyReq,
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
    // Campos de comprador (se existirem no request)
    buyer_email,
    buyer_phone,
    buyer_document,
    buyer_name,
  } = requestData;

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

  const validatedContainProductIds: string[] = containProductIds || [];
  const validatedContainOfferIds: string[] = containOfferIds || [];
  const validatedFirstBuyProductIds: string[] = firstBuyProductIds || [];
  const validatedFirstBuyOfferIds: string[] = firstBuyOfferIds || [];
  const validatedFirstBuyStartDate: string =
    firstBuyStartDate === "null" || !firstBuyStartDate
      ? ""
      : firstBuyStartDate;
  const validatedFirstBuyEndDate: string =
    firstBuyEndDate === "null" || !firstBuyEndDate ? "" : firstBuyEndDate;
  const validatedmaxDaysWoBuy: number | null = maxDaysWoBuy;
  const validatedminDaysWoBuy: number | null = minDaysWoBuy;
  const validatedmaxTransactions: number | null = maxTransactions;
  const validatedminTransactions: number | null = minTransactions;
  const validatedmaxLTV: number | null = maxLTV;
  const validatedminLTV: number | null = minLTV;

  if (!projectId) throw new Error("O parâmetro 'project_id' é obrigatório.");
  if (!userId) throw new Error("O parâmetro 'user_id' é obrigatório.");

  const database = "omni_sales";
  const pageSize = 10000;
  let pageDB = 0;
  let allData: TransactionData[] = [];

  const selectionString = getSelectionString();

  // Resolver clusterIds quando filtros de comprador forem usados
  let clusterIds: string[] | undefined;
  const emailN = normalizeEmail(buyer_email);
  const phoneN = normalizePhone(buyer_phone);
  const docN = normalizeDocument(buyer_document);
  if (emailN || phoneN || docN || buyer_name) {
    clusterIds = await getClusterIdsByFilters({
      emailN: emailN ?? undefined,
      phoneN: phoneN ?? undefined,
      docN: docN ?? undefined,
      name: buyer_name ?? undefined,
    });
  }

  while (true) {
    let query = supabase
      .from(database)
      .select(selectionString)
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("transaction_date", { ascending: asc })
      .range(pageDB * pageSize, (pageDB + 1) * pageSize - 1);

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
    if (clusterIds && clusterIds.length > 0) {
      if (clusterIds.length === 1) query = query.eq("customer_hash", clusterIds[0]);
      else query = query.in("customer_hash", clusterIds);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erro na consulta: ${error.message}`);
    if (!data || data.length === 0) break;

    const specifiedData = data as unknown as TransactionData[];
    allData = allData.concat(specifiedData);
    pageDB++;
  }

  const buyersData: { [email: string]: BuyerData } = {};
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
    remOfferIds: remOfferIds || [],
    remProductIds: remProductIds || [],
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
}
