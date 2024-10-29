import { supabase } from "../../config/supabaseClient";
import { abstraction } from "../abstractionBuyer";
import * as XLSX from "xlsx";

export async function download(req: any, res: any) {
  try {
    const { filteredBuyersData } = await abstraction({ req });
    const { exportCsv } = req.query;

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

    const filePath = `SiriusLTV_Compradores_${Date.now()}${
      exportCsv ? ".csv" : ".xlsx"
    }`;

    let fileData;
    let contentType;

    if (exportCsv) {
      // Gerar CSV
      fileData = jsonToCSV(
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
          averageDaysBetweenPurchases: (
            buyer.averageDaysBetweenPurchases ?? 0
          ).toFixed(0),
          averageTicket: buyer.averageTicket.toFixed(2),
          productList: buyer.shopList
            .map((item) => item.productName)
            .join(" | "),
          allEmails: buyer.allEmails?.join(" | "),
          allPhones: buyer.allPhones?.join(" | "),
          allNames: buyer.allNames?.join(" | "),
          allDocuments: buyer.allDocuments?.join(" | "),
        }))
      );
      contentType = "text/csv";
    } else {
      // Gerar XLSX
      fileData = joinToXLSX(filteredBuyersData, filePath);
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    const fileBucket = supabase.storage.from("files");

    const { data, error } = await fileBucket.upload(filePath, fileData, {
      contentType,
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

    return res.status(200).json(response);
  } catch (error) {
    console.error("Erro ao processar customerReport:", error);
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

export function joinToXLSX(jsonData: any[], filePath: string) {
  if (jsonData.length === 0) return "";

  const ws = XLSX.utils.json_to_sheet(
    jsonData.map((buyer) => ({
      Nome: buyer.buyerName,
      Email: buyer.buyerEmail,
      Pais: buyer.pais,
      Telefone: buyer.telefone,
      Documento: buyer.buyerDocument,
      LTV: (buyer.totalSpend ?? 0).toFixed(2).replace(".", ","),
      "Total Transacoes": buyer.totalTransactions,
      "Dias No Negocio": buyer.daysInTheBusiness,
      "Dias Sem Comprar": buyer.daysWithoutBuy,
      "Media de Dias Entre Compras": buyer.averageDaysBetweenPurchases,
      "Ticket Medio": (buyer.averageTicket ?? 0).toFixed(2).replace(".", ","),
      "Lista de Produtos": buyer.shopList
        ?.map((item) => item.productName)
        .join(" | "),
      "E-mails Associados": buyer.allEmails?.join(" | "),
      "Telefones Associados": buyer.allPhones?.join(" | "),
      "Nomes Utilizados": buyer.allNames?.join(" | "),
      "Documentos Utilizados": buyer.allDocuments?.join(" | "),
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filePath);

  return filePath; // Retorna o caminho do arquivo gerado
}
