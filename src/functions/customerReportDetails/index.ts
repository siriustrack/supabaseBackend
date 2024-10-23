import { abstraction } from "../abstractionBuyer";

export async function customerReportDetails(req: any, res: any) {
  try {
    // Extraindo dados da abstraction, incluindo os parâmetros opcionais
    const { filteredBuyersData, page, limit, orderKey, orderDirection } =
      await abstraction({ req });

    // Definindo valores padrão se os parâmetros não forem fornecidos
    const currentPage = parseInt(page || "1", 10);
    const itemsPerPage = parseInt(limit || "20", 10);

    // deno-lint-ignore prefer-const
    let sortedBuyersData = [...filteredBuyersData];

    // Ordenação dos dados
    if (orderKey) {
      sortedBuyersData.sort((a, b) => {
        const compareValue =
          a[orderKey] > b[orderKey] ? 1 : a[orderKey] < b[orderKey] ? -1 : 0;
        return orderDirection === "ASC" ? compareValue : -compareValue;
      });
    }

    // Paginação dos dados
    const totalBuyers = sortedBuyersData.length;
    const totalPages = Math.ceil(totalBuyers / itemsPerPage);
    const paginatedBuyersData = sortedBuyersData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    const totalTransactions = sortedBuyersData.reduce(
      (acc, buyer) => acc + buyer.totalTransactions,
      0
    );

    // Montando a resposta
    const response = {
      currentPage,
      totalPages,
      totalBuyers,
      totalTransactions,
      data: paginatedBuyersData,
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
