import { abstraction } from "../abstractionBuyer";

export async function productReports(req: any, res: any) {
  try {
    const { filteredBuyersData } = await abstraction({ req });

    const productReports: {
      [productId: string]: {
        product: string;
        totalCustomers: number;
        totalBuyersOfThisProduct: number;
        totalSpend: number;
        totalFirstSpend: number;
        totalProgressSpend: number;
        offers: {
          offerCode: string;
          totalCustomers: number;
          totalBuyersOfThisOffer: number;
          totalSpend: number;
          totalFirstSpend: number;
          totalProgressSpend: number;
        }[];
      };
    } = {};

    for (const buyer of filteredBuyersData) {
      const countedProducts = new Set<string>(); // Movido para dentro do loop
      const countedOffers = new Set<string>(); // Movido para dentro do loop

      const firstBuy = buyer.shopList[0];
      if (firstBuy) {
        const productId = firstBuy.productId;
        const productName = firstBuy.productName!;
        const offerId = firstBuy.offerId;
        const totalSpend = buyer.totalSpend;
        const totalFirstSpend = firstBuy.purchaseValue;
        const totalProgressSpend = totalSpend - totalFirstSpend;

        if (!productReports[productId]) {
          productReports[productId] = {
            product: productName,
            totalCustomers: 0,
            totalBuyersOfThisProduct: 0,
            totalSpend: 0,
            totalFirstSpend: 0,
            totalProgressSpend: 0,
            offers: [],
          };
        }

        const productReport = productReports[productId];
        productReport.totalCustomers += 1;
        productReport.totalSpend += totalSpend;
        productReport.totalFirstSpend += totalFirstSpend;
        productReport.totalProgressSpend += totalProgressSpend;

        let offerReport = productReport.offers.find(
          (offer) => offer.offerCode === offerId
        );

        if (!offerReport) {
          offerReport = {
            offerCode: offerId!,
            totalCustomers: 0,
            totalBuyersOfThisOffer: 0,
            totalSpend: 0,
            totalFirstSpend: 0,
            totalProgressSpend: 0,
          };
          productReport.offers.push(offerReport);
        }
        offerReport.totalCustomers += 1;
        offerReport.totalSpend += totalSpend;
        offerReport.totalFirstSpend += totalFirstSpend;
        offerReport.totalProgressSpend += totalProgressSpend;
      }

      // Contabiliza totalBuyersOfThisProduct e totalBuyersOfThisOffer para qualquer posição na shopList
      buyer.shopList.forEach((item) => {
        if (!countedProducts.has(item.productId)) {
          if (!productReports[item.productId]) {
            productReports[item.productId] = {
              product: item.productName,
              totalCustomers: 0,
              totalBuyersOfThisProduct: 0,
              totalSpend: 0,
              totalFirstSpend: 0,
              totalProgressSpend: 0,
              offers: [],
            };
          }
          productReports[item.productId].totalBuyersOfThisProduct += 1;
          countedProducts.add(item.productId);
        }

        let offerReport = productReports[item.productId].offers.find(
          (offer) => offer.offerCode === item.offerId
        );

        if (!offerReport) {
          offerReport = {
            offerCode: item.offerId,
            totalCustomers: 0,
            totalBuyersOfThisOffer: 0,
            totalSpend: 0,
            totalFirstSpend: 0,
            totalProgressSpend: 0,
          };
          productReports[item.productId].offers.push(offerReport);
        }

        if (!countedOffers.has(item.offerId)) {
          offerReport.totalBuyersOfThisOffer += 1;
          countedOffers.add(item.offerId);
        }
      });
    }

    const response = {
      data: Object.values(productReports),
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
