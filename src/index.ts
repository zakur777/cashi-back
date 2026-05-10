import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { indexRoutes } from './routes/index.routes.js';

export const app = new Hono();

app.get('/', (c) => c.json({ name: 'cashi-api', status: 'running' }, 200));
app.route('/', indexRoutes);

const port = Number(process.env.PORT ?? 3000);

if (import.meta.url === `file://${process.argv[1]}`) {
  serve({ fetch: app.fetch, port });
}
