import express from "express";
import dotenv from "dotenv";
import { abstraction } from "./functions/abstractionBuyer/index";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsing do body em JSON
app.use(express.json());

// Rota principal que aponta para o endpoint abstractionBuyer
app.post("/abstractionBuyer", async (req, res) => {
  try {
    const result = await abstraction({
      req,
      asc: true,
      includeCurrencyFilter: true,
    });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
