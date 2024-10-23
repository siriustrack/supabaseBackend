import { fetchAbstractionData } from "../../utils/fetchAbstractionData";
import { abstraction } from "../abstractionBuyer";

export async function customerReport(req: any) {
  try {
    const { filteredBuyersData } = await abstraction({ req });

    let allTransactions = 0;
    let buyersProgress = 0;
    let buyersStopped = 0;
    let allSpend = 0.0;
    let totalBuyers = 0;
    let totalReBuy = 0.0;
    let totalFirstBuyPurchases = 0.0;
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
  } catch (error) {
    console.error("Erro ao processar customerReport:", error);
    throw new Error(error.message || "Erro ao processar a requisição");
  }
}
