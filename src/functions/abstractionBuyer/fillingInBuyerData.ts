import { ShopItem } from "../../models/BuyerData";
import { BuyerData } from "../../models/BuyerData";
import { TransactionData } from "../../models/TransactionData";
import { ConditionType } from "./index";

interface Params {
  specifiedData: TransactionData[];
  buyersData: {
    [email: string]: BuyerData;
  };
  validatedFirstBuyStartDate: string;
  validatedFirstBuyEndDate: string;
  validatedmaxDaysWoBuy: number | null;
  validatedminDaysWoBuy: number | null;
  validatedmaxLTV: number | null;
  validatedminLTV: number | null;
  validatedFirstBuyProductIds: string[];
  remProductIds: string[];
  remOfferIds: string[];
  validatedContainProductIds: string[];
  validatedContainOfferIds: string[];
  validatedFirstBuyOfferIds: string[];
  validatedConditionContainProductIds: ConditionType;
  validatedConditionContainOfferIds: ConditionType;
  validatedConditionRemProductIds: ConditionType;
  validatedConditionRemOfferIds: ConditionType;
  validatedmaxTransactions: number | null;
  validatedminTransactions: number | null;
}
// Array com valores inválidos
const invalidValues = [
  "null",
  "undefined",
  "",
  "(none)",
  "",
  "Não encontrado.",
];

// Função utilitária para verificar valores inválidos
function isValid(value: string | null | undefined): boolean {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !invalidValues.includes(value)
  );
}

function addToSetIfValid(
  item: string,
  setArray: string[] | undefined
): string[] {
  const itemSet = setArray ? new Set<string>(setArray) : new Set<string>();
  itemSet.add(item);
  return Array.from(itemSet);
}
// Função utilitária para limpar números e remover espaços em branco
function cleanNumber(value: string | null | undefined): string {
  return value ? value.trim().replace(/\D/g, "") : "";
}

function removeLeadingZeros(document: string): string {
  return document.replace(/^0+/, "");
}

export const fillingInBuyerData = ({
  specifiedData,
  buyersData,
  validatedFirstBuyStartDate,
  validatedFirstBuyEndDate,
  validatedmaxDaysWoBuy,
  validatedminDaysWoBuy,
  validatedmaxLTV,
  validatedminLTV,
  validatedFirstBuyProductIds,
  remOfferIds,
  remProductIds,
  validatedContainProductIds,
  validatedContainOfferIds,
  validatedFirstBuyOfferIds,
  validatedConditionContainProductIds,
  validatedConditionContainOfferIds,
  validatedConditionRemProductIds,
  validatedConditionRemOfferIds,
  validatedmaxTransactions,
  validatedminTransactions,
}: Params) => {
  // // Contar o total de transações antes de populateBuyersData
  // const totalTransactionsBefore = specifiedData.length;

  // console.log(
  //   "Total de transações antes de agrupar por e-mail (populateBuyersData):",
  //   totalTransactionsBefore,
  // );

  // 1. Popula os dados dos compradores agrupando por email
  populateBuyersData(specifiedData, buyersData);

  // Log de totalTransactions e totalSpend antes de aggregateByDocument
  let totalTransactionsBeforeDoc = 0;
  let totalSpendBeforeDoc = 0;
  Object.values(buyersData).forEach((buyer) => {
    totalTransactionsBeforeDoc += buyer.totalTransactions;
    totalSpendBeforeDoc += buyer.totalSpend;
  });
  // console.log(
  //   "Antes de aggregateByDocument - Total Transactions:",
  //   totalTransactionsBeforeDoc,
  // );
  // console.log(
  //   "Antes de aggregateByDocument - Total Spend:",
  //   totalSpendBeforeDoc,
  // );

  const mergedBuyersDataDoc = aggregateByDocument(buyersData);

  // Log de totalTransactions e totalSpend após aggregateByDocument
  let totalTransactionsAfterDoc = 0;
  let totalSpendAfterDoc = 0;
  Object.values(mergedBuyersDataDoc).forEach((buyer) => {
    totalTransactionsAfterDoc += buyer.totalTransactions;
    totalSpendAfterDoc += buyer.totalSpend;
  });
  // console.log(
  //   "Após aggregateByDocument - Total Transactions:",
  //   totalTransactionsAfterDoc,
  // );
  // console.log("Após aggregateByDocument - Total Spend:", totalSpendAfterDoc);

  // Log de totalTransactions e totalSpend antes de aggregateByPhone
  let totalTransactionsBeforePhone = 0;
  let totalSpendBeforePhone = 0;
  Object.values(mergedBuyersDataDoc).forEach((buyer) => {
    totalTransactionsBeforePhone += buyer.totalTransactions;
    totalSpendBeforePhone += buyer.totalSpend;
  });
  // console.log(
  //   "Antes de aggregateByPhone - Total Transactions:",
  //   totalTransactionsBeforePhone,
  // );
  // console.log(
  //   "Antes de aggregateByPhone - Total Spend:",
  //   totalSpendBeforePhone,
  // );

  const mergedBuyersData = aggregateByPhone(mergedBuyersDataDoc);

  // Log de totalTransactions e totalSpend após aggregateByPhone
  let totalTransactionsAfterPhone = 0;
  let totalSpendAfterPhone = 0;
  Object.values(mergedBuyersData).forEach((buyer) => {
    totalTransactionsAfterPhone += buyer.totalTransactions;
    totalSpendAfterPhone += buyer.totalSpend;
  });
  // console.log(
  //   "Após aggregateByPhone - Total Transactions:",
  //   totalTransactionsAfterPhone,
  // );
  // console.log("Após aggregateByPhone - Total Spend:", totalSpendAfterPhone);

  // 3. Calcula as métricas para os dados agregados
  calculateBuyerMetrics(mergedBuyersData);

  // Log de totalTransactions e totalSpend após calculateBuyerMetrics
  let totalTransactionsAfterMetrics = 0;
  let totalSpendAfterMetrics = 0;
  Object.values(mergedBuyersData).forEach((buyer) => {
    totalTransactionsAfterMetrics += buyer.totalTransactions;
    totalSpendAfterMetrics += buyer.totalSpend;
  });
  // console.log(
  //   "Após calculateBuyerMetrics - Total Transactions:",
  //   totalTransactionsAfterMetrics,
  // );
  // console.log(
  //   "Após calculateBuyerMetrics - Total Spend:",
  //   totalSpendAfterMetrics,
  // );

  let filteredSortedData = Object.values(mergedBuyersData).sort(
    (a, b) => b.totalTransactions - a.totalTransactions
  );

  filteredSortedData = applyBuyerFilters({
    filteredSortedData,
    validatedFirstBuyStartDate,
    validatedFirstBuyProductIds,
    validatedFirstBuyEndDate,
    validatedmaxDaysWoBuy,
    validatedminDaysWoBuy,
    validatedmaxLTV,
    validatedminLTV,
    remOfferIds,
    remProductIds,
    validatedContainOfferIds,
    validatedFirstBuyOfferIds,
    validatedContainProductIds,
    validatedConditionContainProductIds,
    validatedConditionContainOfferIds,
    validatedConditionRemProductIds,
    validatedConditionRemOfferIds,
    validatedmaxTransactions,
    validatedminTransactions,
  });

  return filteredSortedData;
};

type BuyerDataFilters = {
  filteredSortedData: BuyerData[];
  validatedFirstBuyStartDate: string;
  validatedFirstBuyProductIds: string[];
  validatedFirstBuyEndDate: string;
  validatedmaxDaysWoBuy: number | null;
  validatedminDaysWoBuy: number | null;
  validatedmaxTransactions: number | null;
  validatedminTransactions: number | null;
  validatedmaxLTV: number | null;
  validatedminLTV: number | null;
  remOfferIds: string[];
  remProductIds: string[];
  validatedContainOfferIds: string[];
  validatedFirstBuyOfferIds: string[];
  validatedContainProductIds: string[];
  validatedConditionContainProductIds: ConditionType;
  validatedConditionContainOfferIds: ConditionType;
  validatedConditionRemProductIds: ConditionType;
  validatedConditionRemOfferIds: ConditionType;
};

function applyBuyerFilters({
  filteredSortedData,
  validatedFirstBuyStartDate,
  validatedFirstBuyProductIds,
  validatedFirstBuyEndDate,
  validatedmaxDaysWoBuy,
  validatedminDaysWoBuy,
  validatedmaxLTV,
  validatedminLTV,
  remOfferIds,
  remProductIds,
  validatedContainOfferIds,
  validatedFirstBuyOfferIds,
  validatedContainProductIds,
  validatedConditionContainProductIds,
  validatedConditionContainOfferIds,
  validatedConditionRemProductIds,
  validatedConditionRemOfferIds,
  validatedmaxTransactions,
  validatedminTransactions,
}: BuyerDataFilters) {
  return filteredSortedData
    .filter((buyer) => {
      if (!buyer.firstBuyDate || !(buyer.firstBuyDate instanceof Date)) {
        return false;
      }

      if (validatedFirstBuyStartDate) {
        const startDate = new Date(validatedFirstBuyStartDate);

        if (new Date(buyer.firstBuyDate) < startDate) {
          return false;
        }
      }

      if (validatedFirstBuyEndDate) {
        const endDate = new Date(validatedFirstBuyEndDate);

        if (new Date(buyer.firstBuyDate) > endDate) {
          return false;
        }
      }

      if (
        Array.isArray(validatedFirstBuyProductIds) &&
        validatedFirstBuyProductIds.length > 0
      ) {
        const productId = buyer.firstBuy?.productId;

        if (!validatedFirstBuyProductIds.includes(productId!)) return false;
      }

      if (validatedmaxDaysWoBuy) {
        if (
          buyer.daysWithoutBuy !== null &&
          buyer.daysWithoutBuy > validatedmaxDaysWoBuy
        ) {
          return false;
        }
      }

      if (validatedminDaysWoBuy) {
        if (
          buyer.daysWithoutBuy !== null &&
          buyer.daysWithoutBuy < validatedminDaysWoBuy
        ) {
          return false;
        }
      }

      if (validatedmaxTransactions) {
        if (
          buyer.totalTransactions !== null &&
          buyer.totalTransactions > validatedmaxTransactions
        ) {
          return false;
        }
      }

      if (validatedminTransactions) {
        if (
          buyer.totalTransactions !== null &&
          buyer.totalTransactions < validatedminTransactions
        ) {
          return false;
        }
      }

      if (validatedmaxLTV) {
        if (buyer.totalSpend > validatedmaxLTV) {
          return false;
        }
      }

      if (validatedminLTV) {
        if (buyer.totalSpend < validatedminLTV) {
          return false;
        }
      }

      return (
        buyer.firstBuy?.bumpType !== "Child" ||
        buyer.firstBuy?.bumpIndex !== "Child" ||
        !buyer.firstBuy
      );
    })
    .filter((buyer) => {
      const hasFirstBuy = buyer.firstBuy;

      const hasProductIds = validateItems({
        shopList: buyer.shopList,
        ids: validatedContainProductIds,
        key: "productId",
        condition: validatedConditionContainProductIds,
      });

      const hasOfferIds = validateItems({
        shopList: buyer.shopList,
        ids: validatedContainOfferIds,
        key: "offerId",
        condition: validatedConditionContainOfferIds,
      });

      const hasRemProductIds = validateItemsHasToRemove({
        shopList: buyer.shopList,
        ids: remProductIds,
        key: "productId",
        condition: validatedConditionRemProductIds,
      });

      const hasRemOfferIds = validateItemsHasToRemove({
        shopList: buyer.shopList,
        ids: remOfferIds,
        key: "offerId",
        condition: validatedConditionRemOfferIds,
      });

      const hasValidatedFirstBuyOfferIds =
        validatedFirstBuyOfferIds?.length > 0
          ? buyer.shopList[0] &&
            validatedFirstBuyOfferIds.includes(buyer.shopList[0].offerId)
          : true;

      if (!hasFirstBuy) {
        return false;
      }

      if (!hasProductIds) {
        return false;
      }

      if (!hasOfferIds) {
        return false;
      }

      if (hasRemProductIds) {
        return false;
      }

      if (hasRemOfferIds) {
        return false;
      }

      if (!hasValidatedFirstBuyOfferIds) {
        return false;
      }

      return true;
    });
}

type ValidateItemsParams = {
  shopList: ShopItem[];
  ids: string[];
  key: keyof ShopItem;
  condition: ConditionType;
};

function validateItems({
  shopList,
  ids,
  key,
  condition,
}: ValidateItemsParams): boolean {
  if (condition === "OU") {
    return (
      ids.length === 0 ||
      shopList.some((item) => ids.includes(item[key] as string))
    );
  } else if (condition === "E") {
    return (
      ids.length === 0 ||
      ids.every((id) => shopList.some((item) => item[key] === id))
    );
  }

  return true;
}

function validateItemsHasToRemove({
  shopList,
  ids,
  key,
  condition,
}: ValidateItemsParams): boolean {
  if (condition === "OU") {
    return (
      ids.length !== 0 &&
      shopList.some((item) => ids.includes(item[key] as string))
    );
  } else if (condition === "E") {
    return (
      ids.length !== 0 &&
      ids.every((id) => shopList.some((item) => item[key] === id))
    );
  }

  return false;
}

function calculateBuyerMetrics(buyersData: { [email: string]: BuyerData }) {
  for (const buyer of Object.values(buyersData)) {
    buyer.shopList.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstValidIndex = buyer.shopList.findIndex(
      (item) => item.bumpType !== "Child" || item.bumpIndex !== "Child"
    );

    if (firstValidIndex > 0) {
      const firstValidBuy = buyer.shopList.splice(firstValidIndex, 1)[0];
      buyer.shopList.unshift(firstValidBuy);
    }

    buyer.firstBuy =
      buyer.shopList.find(
        (item) => item.bumpType !== "Child" || item.bumpIndex !== "Child"
      ) || null;

    let totalDaysBetweenPurchases = 0;

    for (let i = 1; i < buyer.shopList.length; i++) {
      const previousPurchaseDate = new Date(
        buyer.shopList[i - 1].date
      ).getTime();

      const currentPurchaseDate = new Date(buyer.shopList[i].date).getTime();

      const daysBetween =
        (currentPurchaseDate - previousPurchaseDate) / (1000 * 60 * 60 * 24);

      totalDaysBetweenPurchases += daysBetween;
    }

    buyer.averageDaysBetweenPurchases =
      buyer.shopList.length > 1
        ? totalDaysBetweenPurchases / (buyer.shopList.length - 1)
        : null;

    buyer.averageTicket =
      buyer.totalTransactions > 0
        ? +(buyer.totalSpend / buyer.totalTransactions).toFixed(2)
        : 0;

    buyer.daysInTheBusiness = buyer.firstBuyDate
      ? Math.floor(
          (new Date().getTime() - buyer.firstBuyDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    buyer.daysWithoutBuy = buyer.lastBuyDate
      ? Math.floor(
          (new Date().getTime() - buyer.lastBuyDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    buyer.lastBuy =
      buyer.shopList.length > 0
        ? buyer.shopList[buyer.shopList.length - 1]
        : null;
  }
}

function populateBuyersData(
  specifiedData: TransactionData[],
  buyersData: {
    [email: string]: BuyerData;
  }
) {
  specifiedData.forEach((row) => {
    const {
      buyer_name,
      buyer_email,
      buyer_phone,
      buyer_document,
      buyer_country,
      transaction_date,
      product_id,
      product_name,
      purchase_value_without_tax,
      currency,
      order_bump_type,
      order_bump_index,
      offer_id,
    } = row;

    let buyer = buyersData[buyer_email];

    if (!buyer) {
      buyer = buyersData[buyer_email] = {
        buyerName: buyer_name,
        buyerEmail: buyer_email,
        buyerDocument: isValid(cleanNumber(buyer_document))
          ? removeLeadingZeros(cleanNumber(buyer_document))
          : "Não encontrado.",
        pais: buyer_country,
        telefone: isValid(cleanNumber(buyer_phone))
          ? cleanNumber(buyer_phone)
          : "Não encontrado.",
        totalSpend: 0,
        totalTransactions: 0,
        shopList: [],
        firstBuyDate: null,
        lastBuyDate: null,
        averageDaysBetweenPurchases: null,
        averageTicket: null,
        daysInTheBusiness: null,
        daysWithoutBuy: null,
        firstBuy: null,
        lastBuy: null,
        allPhones: [],
        allNames: [],
        allDocuments: [],
        allEmails: [],
      };
    }
    if (buyer.telefone === "Não encontrado." && isValid(buyer_phone)) {
      buyer.telefone = buyer_phone;
    }

    if (buyer.buyerDocument === "Não encontrado." && isValid(buyer_document)) {
      buyer.buyerDocument = buyer_document;
    }

    buyer.totalSpend += purchase_value_without_tax;

    buyer.totalTransactions++;

    const transactionDate = new Date(transaction_date);

    if (
      !buyer.firstBuyDate ||
      (transactionDate < buyer.firstBuyDate &&
        (order_bump_type !== "Child" || order_bump_index !== "Child"))
    ) {
      buyer.firstBuyDate = transactionDate;
    }
    if (!buyer.lastBuyDate || transactionDate > buyer.lastBuyDate) {
      buyer.lastBuyDate = transactionDate;
    }

    buyer.shopList.push({
      productId: product_id,
      productName: product_name,
      currencyCode: currency,
      purchaseValue: purchase_value_without_tax,
      bumpType: order_bump_type,
      bumpIndex: order_bump_index,
      date: transaction_date,
      offerId: offer_id,
    });

    // Armazenar documentos adicionais se forem válidos
    if (isValid(cleanNumber(buyer_document))) {
      buyer.allDocuments = addToSetIfValid(
        cleanNumber(buyer_document),
        buyer.allDocuments
      );
    }

    if (isValid(cleanNumber(buyer_phone))) {
      buyer.allPhones = addToSetIfValid(
        cleanNumber(buyer_phone),
        buyer.allPhones
      );
    }

    // Armazenar nomes adicionais se forem válidos
    if (isValid(buyer_name)) {
      buyer.allNames = addToSetIfValid(buyer_name, buyer.allNames);
    }

    // Armazenar emails adicionais se forem válidos
    if (isValid(buyer_email)) {
      buyer.allEmails = addToSetIfValid(buyer_email, buyer.allEmails);
    }
  });
}

function aggregateByDocument(buyersData: { [email: string]: BuyerData }) {
  const mergedBuyersData: { [document: string]: BuyerData } = {};

  Object.values(buyersData).forEach((buyer) => {
    let buyerDocument = cleanNumber(buyer.buyerDocument);

    // Atribua um identificador único para usuários sem documento válido
    if (!isValid(buyerDocument)) {
      buyerDocument = `no-doc-${buyer.buyerEmail}`;
    }
    if (mergedBuyersData[buyerDocument]) {
      // Merge shopList
      mergedBuyersData[buyerDocument].shopList = [
        ...mergedBuyersData[buyerDocument].shopList,
        ...buyer.shopList,
      ];

      mergedBuyersData[buyerDocument].shopList.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Garantir que a primeira transação não seja `orderBump` ou `index = Child`
      const firstValidIndex = mergedBuyersData[
        buyerDocument
      ].shopList.findIndex(
        (item) => item.bumpType !== "Child" && item.bumpIndex !== "Child"
      );

      if (firstValidIndex > 0) {
        const firstValidBuy = mergedBuyersData[buyerDocument].shopList.splice(
          firstValidIndex,
          1
        )[0];
        mergedBuyersData[buyerDocument].shopList.unshift(firstValidBuy);
      }

      // Recalcular firstBuy e lastBuy
      const allTransactions = mergedBuyersData[buyerDocument].shopList;
      allTransactions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      mergedBuyersData[buyerDocument].firstBuy = allTransactions[0];
      mergedBuyersData[buyerDocument].firstBuyDate = new Date(
        allTransactions[0].date
      );
      mergedBuyersData[buyerDocument].lastBuy =
        allTransactions[allTransactions.length - 1];
      mergedBuyersData[buyerDocument].lastBuyDate = new Date(
        allTransactions[allTransactions.length - 1].date
      );

      // Recalcular outros campos se necessário
      mergedBuyersData[buyerDocument].totalSpend += buyer.totalSpend;
      mergedBuyersData[buyerDocument].totalTransactions +=
        buyer.totalTransactions;

      mergedBuyersData[buyerDocument].allEmails = [
        ...new Set([
          ...(mergedBuyersData[buyerDocument].allEmails || []),
          ...(buyer.allEmails || []),
        ]),
      ];

      mergedBuyersData[buyerDocument].allPhones = [
        ...new Set([
          ...(mergedBuyersData[buyerDocument].allPhones || []),
          ...(buyer.allPhones || []),
        ]),
      ];

      mergedBuyersData[buyerDocument].allNames = [
        ...new Set([
          ...(mergedBuyersData[buyerDocument].allNames || []),
          ...(buyer.allNames || []),
        ]),
      ];

      mergedBuyersData[buyerDocument].allDocuments = [
        ...new Set([
          ...(mergedBuyersData[buyerDocument].allDocuments || []),
          ...(buyer.allDocuments || []),
        ]),
      ];

      // Verifique o número de transações após a combinação
      // console.log(
      //   "Após combinar - totalTransactions no mergedBuyersData:",
      //   mergedBuyersData[buyerDocument].totalTransactions
      // );
    } else {
      mergedBuyersData[buyerDocument] = buyer;
    }
  });

  return mergedBuyersData;
}

function aggregateByPhone(buyersData: { [email: string]: BuyerData }) {
  const mergedBuyersData: { [phone: string]: BuyerData } = {};

  Object.values(buyersData).forEach((buyer) => {
    // Limpa e normaliza o telefone do comprador
    let buyerPhone = cleanNumber(buyer.telefone);

    // Atribua um identificador único para usuários sem telefone válido
    if (!isValid(buyerPhone)) {
      buyerPhone = `no-phone-${buyer.buyerEmail}`;
    }

    if (mergedBuyersData[buyerPhone]) {
      // Mesclar a lista de compras (shopList)
      mergedBuyersData[buyerPhone].shopList = [
        ...mergedBuyersData[buyerPhone].shopList,
        ...buyer.shopList,
      ];

      mergedBuyersData[buyerPhone].shopList.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Garantir que a primeira transação não seja `orderBump` ou `index = Child`
      const firstValidIndex = mergedBuyersData[buyerPhone].shopList.findIndex(
        (item) => item.bumpType !== "Child" && item.bumpIndex !== "Child"
      );

      if (firstValidIndex > 0) {
        const firstValidBuy = mergedBuyersData[buyerPhone].shopList.splice(
          firstValidIndex,
          1
        )[0];
        mergedBuyersData[buyerPhone].shopList.unshift(firstValidBuy);
      }

      // Recalcular firstBuy e lastBuy
      const allTransactions = mergedBuyersData[buyerPhone].shopList;
      allTransactions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      mergedBuyersData[buyerPhone].firstBuy = allTransactions[0];
      mergedBuyersData[buyerPhone].firstBuyDate = new Date(
        allTransactions[0].date
      );
      mergedBuyersData[buyerPhone].lastBuy =
        allTransactions[allTransactions.length - 1];
      mergedBuyersData[buyerPhone].lastBuyDate = new Date(
        allTransactions[allTransactions.length - 1].date
      );

      // Recalcular outros campos se necessário
      mergedBuyersData[buyerPhone].totalSpend += buyer.totalSpend;
      mergedBuyersData[buyerPhone].totalTransactions += buyer.totalTransactions;

      mergedBuyersData[buyerPhone].allEmails = [
        ...new Set([
          ...(mergedBuyersData[buyerPhone].allEmails || []),
          ...(buyer.allEmails || []),
        ]),
      ];

      mergedBuyersData[buyerPhone].allPhones = [
        ...new Set([
          ...(mergedBuyersData[buyerPhone].allPhones || []),
          ...(buyer.allPhones || []),
        ]),
      ];

      mergedBuyersData[buyerPhone].allNames = [
        ...new Set([
          ...(mergedBuyersData[buyerPhone].allNames || []),
          ...(buyer.allNames || []),
        ]),
      ];

      mergedBuyersData[buyerPhone].allDocuments = [
        ...new Set([
          ...(mergedBuyersData[buyerPhone].allDocuments || []),
          ...(buyer.allDocuments || []),
        ]),
      ];
    } else {
      mergedBuyersData[buyerPhone] = buyer;
    }
  });

  return mergedBuyersData;
}
