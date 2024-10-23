import { BuyerData } from "../../models/BuyerData";
import { abstraction } from "../abstractionBuyer";

interface GroupedData {
  [date: string]: {
    date: string;
    buyers: BuyerData[];
    totalDailyBuyers: number;
    totalDailyAllSpend: number;
    totalDailyReturn: number;
    firstBuyPurchaseValue: number;
    lifeTimeValue: number;
  };
}

interface DailyData {
  date: string;
  totalDailyBuyers: number;
  totalDailyAllSpend: number;
  totalDailyReturn: number;
}

interface ResponseData {
  data: DailyData[];
}

export async function newCustomersByDay(req: any, res: any): Promise<Response> {
  try {
    const { filteredBuyersData } = await abstraction({ req });

    // Agrupar compradores por firstBuyDate
    const groupedByDate: GroupedData = filteredBuyersData.reduce(
      (acc: GroupedData, buyer: BuyerData) => {
        const date: string = buyer.firstBuy ? buyer.firstBuy.date : "Unknown";
        if (!acc[date]) {
          acc[date] = {
            date,
            buyers: [],
            totalDailyBuyers: 0,
            totalDailyAllSpend: 0,
            totalDailyReturn: 0,
            firstBuyPurchaseValue: 0,
            lifeTimeValue: 0,
          };
        }
        acc[date].buyers.push(buyer);
        return acc;
      },
      {}
    );

    // Calcular valores para cada grupo
    Object.values(groupedByDate).forEach((group) => {
      group.totalDailyBuyers = group.buyers.length;
      group.buyers.forEach((buyer) => {
        group.totalDailyAllSpend += buyer.totalSpend;
        if (buyer.firstBuy) {
          group.firstBuyPurchaseValue += buyer.firstBuy.purchaseValue;
        }
        buyer.shopList.forEach((item) => {
          group.lifeTimeValue += item.purchaseValue;
        });
      });
      group.totalDailyReturn =
        group.firstBuyPurchaseValue > 0
          ? group.lifeTimeValue / group.firstBuyPurchaseValue
          : 0;
    });

    // Preparar a resposta
    const data: DailyData[] = Object.values(groupedByDate).map(
      ({ date, totalDailyBuyers, totalDailyAllSpend, totalDailyReturn }) => ({
        date,
        totalDailyBuyers,
        totalDailyAllSpend: parseFloat(totalDailyAllSpend.toFixed(2)),
        totalDailyReturn: parseFloat(totalDailyReturn.toFixed(2)),
      })
    );

    const response: ResponseData = { data };

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
