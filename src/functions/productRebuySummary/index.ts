import { ShopItem } from "../../models/BuyerData";
import { abstraction } from "../abstractionBuyer";

// Função que calcula a diferença em dias entre duas datas
function calculateDaysDifference(date1: string, date2: string): number {
  const diffInTime = new Date(date2).getTime() - new Date(date1).getTime();
  return Math.ceil(diffInTime / (1000 * 3600 * 24));
}

// Função principal que lida com a requisição HTTP
export async function productRebuySummary(req: any, res: any) {
  try {
    // Obtém os dados filtrados dos compradores usando a função abstraction
    const { filteredBuyersData } = await abstraction({ req });

    let totalTransactions = 0;
    let totalSumSpend = 0;
    let totalSumSpendBusiness = 0;
    let totalTransactionsBusiness = 0;

    // Objeto para armazenar os dados de recompra por produto
    const productRebuyData = {} as {
      [productId: string]: {
        productId: string;
        productName: string;
        currencyCode: string;
        totalSpend: number;
        totalTransactions: number;
        totalDaysBetweenPurchases: number;
      };
    };

    // Itera sobre cada comprador filtrado
    filteredBuyersData.forEach((buyer) => {
      const firstPurchaseDate = buyer.shopList[0].date;

      totalSumSpendBusiness += buyer.totalSpend;
      totalTransactionsBusiness += buyer.totalTransactions;

      // Mapa para armazenar produtos únicos comprados pelo comprador
      const uniqueProducts = new Map<string, ShopItem>();

      // Itera sobre a lista de compras do comprador para preencher o mapa de produtos únicos
      buyer.shopList.forEach((item) => {
        if (uniqueProducts.get(item.productId)) return;
        uniqueProducts.set(item.productId, item);
      });

      // Converte o mapa de produtos únicos em um array
      const uniqueProductsArray = Array.from(uniqueProducts.values());

      // Itera sobre o array de produtos únicos
      uniqueProductsArray.forEach((item, index) => {
        if (index === 0) {
          return; // Pula o primeiro item (primeira compra)
        }

        // Calcula os dias entre a primeira compra e a compra atual
        const daysBetween = calculateDaysDifference(
          firstPurchaseDate,
          item.date
        );
        totalSumSpend += item.purchaseValue;
        totalTransactions++;

        // Se o produto não existir no objeto productRebuyData, adiciona-o
        if (!productRebuyData[item.productId]) {
          productRebuyData[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            currencyCode: item.currencyCode,
            totalSpend: item.purchaseValue,
            totalTransactions: 1,
            totalDaysBetweenPurchases: daysBetween,
          };
        } else {
          // Caso contrário, atualiza os dados existentes do produto
          const currentData = productRebuyData[item.productId];
          currentData.totalSpend += item.purchaseValue;
          currentData.totalTransactions++;
          currentData.totalDaysBetweenPurchases += daysBetween;
        }
      });
    });

    // Cria uma lista de objetos contendo os dados agrupados por produto
    const totalRebuyGroupedByProducts = Object.values(productRebuyData).map(
      (product) => {
        return {
          productId: product.productId,
          offerIdList: [],
          totalSpend: product.totalSpend,
          totalTransactions: product.totalTransactions,
          averageDaysBetweenPurchases:
            product.totalDaysBetweenPurchases / product.totalTransactions,
          percentOfTotalSumSpend: totalSumSpendBusiness
            ? product.totalSpend / totalSumSpendBusiness
            : 0,
          percentOfTotalTransactions: totalTransactionsBusiness
            ? product.totalTransactions / totalTransactionsBusiness
            : 0,
          productName: product.productName,
        };
      }
    );

    // Dados de resposta que serão enviados ao cliente
    const response = {
      data: {
        totalTransactions,
        totalSumSpend,
        totalRebuyGroupedByProducts,
      },
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
