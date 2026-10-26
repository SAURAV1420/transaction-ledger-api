import express, { Application } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import Database from 'better-sqlite3';
import { getDatabase } from './config/db';
import { createApiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { swaggerDocument } from './docs/swagger';

export function createApp(db?: Database.Database): Application {
  const app = express();
  const database = db || getDatabase();

  // Standard Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Interactive Swagger UI documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/docs', (_req, res) => {
    res.redirect('/api-docs');
  });

  // Swagger JSON spec endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  // Mount API v1 router
  app.use('/api/v1', createApiRouter(database));

  // Root welcome route
  app.get('/', (_req, res) => {
    res.json({
      name: 'Transaction Ledger API',
      version: '1.0.0',
      documentation: '/api-docs',
      health: '/api/v1/health'
    });
  });

  // 404 and Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
