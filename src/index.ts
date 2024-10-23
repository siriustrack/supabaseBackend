import express from "express";
import dotenv from "dotenv";
import { abstraction } from "./functions/abstractionBuyer/index";
import { customerReport } from "./functions/customerReport/index";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsing do body em JSON
app.use(express.json());

// Rota principal que aponta para o endpoint abstractionBuyer
app.post("/abstractionBuyer", async (req, res) => {
  try {
    const result = await abstraction({ req });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/customerReport", async (req, res) => {
  try {
    await customerReport(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
