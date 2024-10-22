export interface ShopItem {
  date: string;
  productId: string;
  productName: string;
  currencyCode: string;
  purchaseValue: number;
  bumpType: string;
  bumpIndex: string | null;
  offerId: string;
}

export interface BuyerData {
  buyerName: string;
  buyerEmail: string;
  buyerDocument: string;
  pais: string;
  telefone: string | null;
  totalSpend: number;
  totalTransactions: number;
  shopList: ShopItem[];
  firstBuyDate: Date | null;
  lastBuyDate: Date | null;
  firstBuy: ShopItem | null;
  averageDaysBetweenPurchases: number | null;
  averageTicket: number | null;
  daysInTheBusiness: number | null;
  daysWithoutBuy: number | null;
  lastBuy: ShopItem | null;
  allEmails?: string[];
  allPhones?: string[];
  allNames?: string[];
  allDocuments?: string[];
}
