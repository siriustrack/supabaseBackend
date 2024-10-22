export const getSelectionString = () => {
  const MY_COMMISSION = "my_commission_value" as const;
  const TOTAL_INSTALLMENTS = "total_installments" as const;
  const PRICE_CODE = "offer_id" as const;
  const SRC_CODE = "src_code" as const;
  const SCK_CODE = "sck_code" as const;
  const PURCHASE_VALUE_WITHOUT_TAXES = "purchase_value_without_tax" as const;
  const PRODUCT = "product_name" as const;
  const PRODUCT_ID = "product_id" as const;
  const PURCHASE_CURRENCY = "currency" as const;
  const TRANSACTION_ID = "transaction_code" as const;
  const SELECT_BUYER_NAME = "buyer_name" as const;
  const SELECT_BUYER_EMAIL = "buyer_email" as const;
  const TRANSACTION_DATE = "transaction_date" as const;
  const SELECT_TELEFONE = "buyer_phone" as const;
  const SELECT_PAIS = "buyer_country" as const;
  const ORDER_BUMP_TYPE = "order_bump_type" as const;
  const TRANSACTION_ORDER_BUMP = "order_bump_transaction" as const;
  const ORDER_BUMP_INDEX = "order_bump_index" as const;
  const BUYER_DOCUMENT = "buyer_document" as const;

  const selectionString = `
        "project_id",
        "user_id",
        "${PURCHASE_VALUE_WITHOUT_TAXES}",
        "${PRODUCT}",
        "${PRODUCT_ID}",
        "${PURCHASE_CURRENCY}",
        "${TRANSACTION_ID}",
        "${SELECT_BUYER_EMAIL}",
        "${SELECT_BUYER_NAME}",
        "${TRANSACTION_DATE}",
        "${SELECT_TELEFONE}",
        "${SELECT_PAIS}",
        "${ORDER_BUMP_TYPE}",
        "${MY_COMMISSION}",
        "${TOTAL_INSTALLMENTS}",
        "${PRICE_CODE}",
        "${SRC_CODE}",
        "${SCK_CODE}",
        "${TRANSACTION_ORDER_BUMP}",
        "${ORDER_BUMP_INDEX}",
        "${BUYER_DOCUMENT}"
      `.trim();
  return selectionString;
};
