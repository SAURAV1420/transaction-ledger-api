import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = process.env.PORT || 5001;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Transaction Ledger API running on port ${PORT}`);
  console.log(`📖 Swagger API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🩺 Health Check:      http://localhost:${PORT}/api/v1/health`);
  console.log(`===============================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
