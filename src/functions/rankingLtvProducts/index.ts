import { abstraction } from "../abstractionBuyer";

export async function rankingLtvProducts(req: any, res: any) {
  try {
    const { filteredBuyersData } = await abstraction({ req });

    let totalTransactions = 0;

    let totalSumSpend = 0;

    const positionCounts = Array.from({ length: 5 }, () => ({
      totalPurchaseValue: 0,
      products: {} as {
        [productId: string]: {
          productId: string;
          productName: string;
          currencyCode: string;
          purchaseValue: number[];
          totalPurchaseValue: number;
          count: number;
        };
      },
    }));

    filteredBuyersData.forEach((buyer) => {
      buyer.shopList.forEach(
        (
          item: {
            productId: string;
            productName: string;
            currencyCode: string;
            purchaseValue: number;
          },
          index: number
        ) => {
          const posData = positionCounts[index];

          if (posData) {
            totalSumSpend += item.purchaseValue;

            if (!posData.products[item.productId]) {
              posData.products[item.productId] = {
                productId: item.productId,
                productName: item.productName,
                currencyCode: item.currencyCode,
                purchaseValue: [item.purchaseValue],
                totalPurchaseValue: item.purchaseValue,
                count: 1,
              };
            } else {
              if (
                !posData.products[item.productId].purchaseValue.includes(
                  item.purchaseValue
                )
              ) {
                posData.products[item.productId].purchaseValue.push(
                  item.purchaseValue
                );
              }
              posData.products[item.productId].totalPurchaseValue +=
                item.purchaseValue;
              posData.products[item.productId].count++;
            }

            posData.totalPurchaseValue += item.purchaseValue;

            totalTransactions++;
          }
        }
      );
    });

    const topPurchasesByPosition = positionCounts.map((posData) => {
      const sumOfTotalPositionValue = posData.totalPurchaseValue;

      const percentOfTotal = (sumOfTotalPositionValue / totalSumSpend) * 100;

      return {
        topPurchases: Object.values(posData.products).sort(
          (a, b) => b.totalPurchaseValue - a.totalPurchaseValue
        ),
        sumOfTotalPositionValue,
        percentOfTotal,
      };
    });

    const response = {
      totalTransactions,
      totalSumSpend,
      t5FirstPurchase: topPurchasesByPosition[0],
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
