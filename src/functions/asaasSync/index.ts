import axios from "axios";
import { Request, Response } from "express";

const url = "https://sandbox.asaas.com/api/v3/payments?status=CONFIRMED";

export async function asaasSync(req: Request, res: Response) {
  const accessToken = process.env.ASAAS_ACCESS_TOKEN; // Token do Asaas no .env
  if (!accessToken) {
    return res.status(500).json({ error: "Access token não configurado." });
  }

  try {
    // Configurações da requisição
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    // Realiza a chamada ao Asaas
    const response = await axios.get(url, options);
    const transactions = response.data;

    // Lógica de inserção no banco (não implementado aqui)
    console.log(
      "Transações sincronizadas:",
      JSON.stringify(transactions, null, 2)
    );

    return res
      .status(200)
      .json({ message: "Sincronização concluída com sucesso.", transactions });
  } catch (error) {
    console.error("Erro na sincronização com o Asaas:", error);
    return res.status(500).json({ error: "Erro ao sincronizar com o Asaas." });
  }
}
