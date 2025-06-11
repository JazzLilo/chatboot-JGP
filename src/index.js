import dotenv from 'dotenv'
import express from 'express'
import cors from "cors";
import { readFile } from 'fs/promises';
import { PORT } from './config/index.js';
import { connectToWhatsApp } from './controllers/conexionBaileys.js'
import indexRouter from './routes/index.routes.js'

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

async function loadPrompts() {
  try {
    const data = await readFile('./src/assets/prompts/prompt.json', 'utf-8');
    const prompts = JSON.parse(data);
    return prompts;
  } catch (error) {
    console.error('Error al cargar el archivo prompt.json:', error);
    return null;
  }
}

const prompts = await loadPrompts();

const userStates = {};


const handlers = {
};

// ------------ INICIAR CONEXIÓN A WHATSAPP -----------
connectToWhatsApp(userStates, prompts, handlers);

app.use("/api", indexRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
