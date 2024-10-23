import { abstraction } from "../abstractionBuyer";

export async function customerReport(req: any, res: any) {
  try {
    // const { filteredBuyersData } = await abstraction({ req });
    // console.log("Dados retornados pela abstraction:", filteredBuyersData);
    // Log completo do retorno da função abstraction
    const result = await abstraction({ req });

    // Verifique se filteredBuyersData foi retornado corretamente
    const { filteredBuyersData } = result;

    // Exibir apenas o primeiro objeto de filteredBuyersData, se existir
    if (filteredBuyersData && filteredBuyersData.length > 0) {
      console.log(
        "Primeiro objeto de filteredBuyersData:",
        JSON.stringify(filteredBuyersData[0], null, 2)
      );
    } else {
      console.error("Nenhum dado de compradores foi retornado.");
    }

    let allTransactions = 0;
    let buyersProgress = 0;
    let buyersStopped = 0;
    let allSpend = 0.0;
    let totalBuyers = 0;
    let totalReBuy = 0.0;
    let totalFirstBuyPurchases = 0.0;
    // Variáveis para novos cálculos
    let totalFirstBuyTicket = 0.0;
    let firstBuyCount = 0;
    let totalRebuyTicket = 0.0;
    let rebuyCount = 0;
    let totalDaysUntilFirstRebuy = 0;
    let buyersWithRebuy = 0;

    for (const buyer of filteredBuyersData) {
      allTransactions += buyer.totalTransactions;

      allSpend += buyer.totalSpend;

      totalBuyers++;

      if (buyer.firstBuy) {
        totalReBuy += buyer.totalSpend - buyer.firstBuy.purchaseValue;
        // Calcular o ticket médio da primeira compra
        totalFirstBuyTicket += buyer.firstBuy.purchaseValue;
        firstBuyCount++;

        // Se o buyer tiver mais de uma compra, calcular a diferença de dias e o ticket médio de recompra
        if (buyer.shopList.length > 1) {
          const firstBuyDate = new Date(buyer.shopList[0].date);
          const secondBuyDate = new Date(buyer.shopList[1].date);

          // Dias até a primeira recompra
          const daysUntilFirstRebuy =
            (secondBuyDate.getTime() - firstBuyDate.getTime()) /
            (1000 * 60 * 60 * 24);
          totalDaysUntilFirstRebuy += daysUntilFirstRebuy;
          buyersWithRebuy++;

          // Calcular o ticket médio de recompra (excluindo o primeiro item)
          const rebuyItems = buyer.shopList.slice(1);
          rebuyItems.forEach((item) => {
            totalRebuyTicket += item.purchaseValue;
            rebuyCount++;
          });
        }

        totalFirstBuyPurchases += buyer.firstBuy.purchaseValue;
      }
      if (buyer.totalTransactions == 1) {
        buyersStopped++;
      } else {
        buyersProgress++;
      }
    }

    const stoppedInFunnelPercent = buyersStopped / totalBuyers;
    const progressingInFunnelPercent = buyersProgress / totalBuyers;
    const averageTransactions = allTransactions / totalBuyers;

    const averageLtv = allSpend / totalBuyers;

    const averageTicket = allSpend / allTransactions;

    // Calcular as médias
    const averageFirstBuyTicket = totalFirstBuyTicket / firstBuyCount;
    const averageRebuyTicket =
      rebuyCount > 0 ? totalRebuyTicket / rebuyCount : 0;
    const averageDaysUntilFirstRebuy =
      buyersWithRebuy > 0 ? totalDaysUntilFirstRebuy / buyersWithRebuy : 0;

    const response = {
      totalTransactions: allTransactions,
      stoppedInFunnel: buyersStopped,
      stoppedInFunnelPercent,
      progressingInFunnel: buyersProgress,
      progressingInFunnelPercent,
      averageTransactions: averageTransactions,
      totalSpend: allSpend.toFixed(2),
      totalBuyers: totalBuyers,
      averageLtv: averageLtv.toFixed(2),
      averageTicket: averageTicket.toFixed(2),
      totalReBuy: totalReBuy.toFixed(2),
      totalFirstBuyPurchases: totalFirstBuyPurchases.toFixed(2),
      averageDaysUntilFirstRebuy: averageDaysUntilFirstRebuy.toFixed(2),
      averageFirstBuyTicket: averageFirstBuyTicket.toFixed(2),
      averageRebuyTicket: averageRebuyTicket.toFixed(2),
    };

    console.log(`Response: ${JSON.stringify(response)}`);

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
