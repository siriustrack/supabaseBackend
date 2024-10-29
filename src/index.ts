import express from "express";
import dotenv from "dotenv";
import { abstraction } from "./functions/abstractionBuyer/index";
import { customerReport } from "./functions/customerReport/index";
import { customerReportDetails } from "./functions/customerReportDetails";
import { download } from "./functions/download";
import { newCustomersByDay } from "./functions/newCustomersByDay";
import { productRebuySummary } from "./functions/productRebuySummary";
import { productReports } from "./functions/productReports";
import { rankingLtvProducts } from "./functions/rankingLtvProducts";
import { manageOrderBumpIndex } from "./functions/manageOrderBumpIndex";
import { listProductsFirstBuy } from "./functions/listProductsFirstBuy";
import { asaasSync } from "./functions/asaasSync";

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

app.post("/customerReportDetails", async (req, res) => {
  try {
    await customerReportDetails(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/download", async (req, res) => {
  try {
    await download(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/listProductsFirstBuy", async (req, res) => {
  try {
    await listProductsFirstBuy(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/manageOrderBumpIndex", async (req, res) => {
  try {
    await manageOrderBumpIndex(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/newCustomersByDay", async (req, res) => {
  try {
    await newCustomersByDay(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/productRebuySummary", async (req, res) => {
  try {
    await productRebuySummary(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/productReports", async (req, res) => {
  try {
    await productReports(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/rankingLtvProducts", async (req, res) => {
  try {
    await rankingLtvProducts(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/asaasSync", async (req, res) => {
  try {
    await asaasSync(req, res); // Passando req e res para a função
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
