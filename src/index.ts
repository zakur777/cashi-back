import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { categoriesRoutes } from './routes/categories.routes.js';
import { indexRoutes } from './routes/index.routes.js';
import { transactionsRoutes } from './routes/transactions.routes.js';

export const app = new Hono();

app.get('/', (c) => c.json({ name: 'cashi-api', status: 'running' }, 200));
app.route('/', indexRoutes);
app.route('/categories', categoriesRoutes);
app.route('/transactions', transactionsRoutes);

const port = Number(process.env.PORT ?? 3000);
const entrypointPath = process.argv[1] ? new URL(`file://${process.argv[1]}`).pathname : null;

if (entrypointPath && import.meta.url.endsWith(entrypointPath)) {
  serve({ fetch: app.fetch, port });
}
