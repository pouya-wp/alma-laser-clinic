import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { apiRouter } from './routes/api.js';
import { setupTelegramBot } from './bot/telegramBot.js';
import { startReminderScheduler } from './services/reminderScheduler.js';

// BigInt JSON serialization fix
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static logos & uploads
app.use('/static/logo', express.static(path.join(__dirname, '../../Logo')));

// Mount API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    clinic: config.clinicName,
    city: config.clinicCity,
    time: new Date().toISOString(),
  });
});

// Start Server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`🌸 Alma Laser Clinic Server running on http://0.0.0.0:${config.port}`);
  console.log(`💎 API Base: http://localhost:${config.port}/api`);

  // Initialize Telegram Bot & Cron Engine
  setupTelegramBot();
  startReminderScheduler();
});
