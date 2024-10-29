import { supabase } from "../../config/supabaseClient";
import { abstraction } from "../abstractionBuyer";
import * as XLSX from "xlsx";
import fs from "fs";

export async function download(req: any, res: any) {
  try {
    const { filteredBuyersData } = await abstraction({ req });
    const { exportCsv } = req.query; // Recebe o parâmetro exportCsv (yes/no)

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

    // Formata os dados comuns para CSV ou XLSX
    const formattedData = filteredBuyersData.map((buyer) => ({
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
    }));

    let filePath;
    if (exportCsv === "yes") {
      filePath = await saveAsCSV(formattedData);
    } else {
      filePath = await saveAsXLSX(formattedData);
    }

    const fileBucket = supabase.storage.from("files");
    const { data, error } = await fileBucket.upload(
      filePath,
      fs.readFileSync(filePath),
      {
        contentType:
          exportCsv === "yes"
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    if (error) {
      throw new Error(error.message);
    }

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
    return res.status(500).json({
      error: error.message || "Ocorreu um erro desconhecido",
    });
  }
}

// Função para salvar como CSV
async function saveAsCSV(jsonData) {
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
  const filePath = `/mnt/data/SiriusLTV_Compradores_${Date.now()}.csv`;
  fs.writeFileSync(filePath, response);
  return filePath;
}

// Função para salvar como XLSX
async function saveAsXLSX(jsonData) {
  const ws = XLSX.utils.json_to_sheet(jsonData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const filePath = `/mnt/data/SiriusLTV_Compradores_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filePath);
  return filePath;
}
