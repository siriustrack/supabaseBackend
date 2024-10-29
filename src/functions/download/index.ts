import { supabase } from "../../config/supabaseClient";
import { abstraction } from "../abstractionBuyer";

export async function download(req: any, res: any) {
  try {
    const { filteredBuyersData } = await abstraction({ req });

    let allTransactions = 0;
    let allSpend = 0.0;
    let totalReBuy = 0.0;
    let totalFirstBuyPurchases = 0.0;

    for (const buyer of filteredBuyersData) {
      allTransactions += buyer.totalTransactions;

      allSpend += buyer.totalSpend;

      if (buyer.firstBuy) {
        totalReBuy += buyer.totalSpend - buyer.firstBuy.purchaseValue;
        totalFirstBuyPurchases += buyer.firstBuy.purchaseValue;
      }
    }

    const csvData = jsonToCSV(
      filteredBuyersData.map((buyer) => ({
        buyerName: buyer.buyerName,
        buyerEmail: buyer.buyerEmail,
        pais: buyer.pais,
        telefone: buyer.telefone,
        doc: buyer.buyerDocument,
        totalSpend: buyer.totalSpend.toFixed(2),
        totalTransactions: buyer.totalTransactions,
        daysInTheBusiness: buyer.daysInTheBusiness,
        daysWithoutBuy: buyer.daysWithoutBuy,
        averageDaysBetweenPurchases:
          buyer.averageDaysBetweenPurchases.toFixed(0),
        averageTicket: buyer.averageTicket.toFixed(2),
        productList: buyer.shopList.map((item) => item.productName).join(" | "),
        allEmails: buyer.allEmails?.join(" | "),
        allPhones: buyer.allPhones?.join(" | "),
        allNames: buyer.allNames?.join(" | "),
        allDocuments: buyer.allDocuments?.join(" | "),
      }))
    );

    const filePath = `SiriusLTV_Compradores_${Date.now()}.csv`;

    const fileBucket = supabase.storage.from("files");

    const { data, error } = await fileBucket.upload(filePath, csvData, {
      contentType: "text/csv",
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log({ data });

    const { data: publicURL } = fileBucket.getPublicUrl(filePath);

    const response = {
      allTransactions,
      allSpend,
      totalReBuy,
      totalFirstBuyPurchases,
      publicURL: publicURL.publicURL,
    };

    // Usando res.json para retornar a resposta ao cliente
    return res.status(200).json(response);
  } catch (error) {
    console.error("Erro ao processar customerReport:", error);

    // Usando res.json para retornar um erro
    return res.status(500).json({
      error: error.message || "Ocorreu um erro desconhecido",
    });
  }
}

export function jsonToCSV(jsonData: any[]): string {
  if (jsonData.length === 0) return "";

  const headers = [
    "Nome",
    "Email",
    "Pais",
    "Telefone",
    "Documento",
    "LTV",
    "Total Transacoes",
    "Dias No Negocio",
    "Dias Sem Comprar",
    "Media de Dias Entre Compras",
    "Ticket Medio",
    "Lista de Produtos",
    "E-mails Associados",
    "Telefones Associados",
    "Nomes Utilizados",
    "Documentos Utilizados",
  ];

  const rows = jsonData
    .map((obj) =>
      Object.values(obj)
        .map((val) => {
          if (typeof val === "string") {
            return `"${val.replace(/"/g, '""')}"`;
          } else {
            return val;
          }
        })
        .join(",")
    )
    .join("\n");

  const response = `${headers.join(",")}\n${rows}`;
  return `${headers.join(",")}\n${rows}`;
}
