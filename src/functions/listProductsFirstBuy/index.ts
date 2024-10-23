import { abstraction } from "../abstractionBuyer";

export async function listProductsFirstBuy(req: any, res: any) {
  try {
    const { filteredBuyersData } = await abstraction({ req });

    const uniqueProducts: {
      [key: string]: {
        productId: string;
        productName: string;
        offerIds: string[];
      };
    } = {};

    for (const buyer of filteredBuyersData) {
      const firstBuy = buyer.firstBuy;
      if (firstBuy && firstBuy.productId) {
        const productId = firstBuy.productId;
        const productName = firstBuy.productName!;
        const offerId = firstBuy.offerId;

        if (!uniqueProducts[productId]) {
          uniqueProducts[productId] = {
            productId,
            productName,
            offerIds: [],
          };
        }

        if (offerId && !uniqueProducts[productId].offerIds.includes(offerId)) {
          uniqueProducts[productId].offerIds.push(offerId);
        }
      }
    }

    const response = {
      data: Object.values(uniqueProducts),
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
