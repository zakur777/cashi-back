import { Hono } from 'hono';

export const indexRoutes = new Hono();

indexRoutes.get('/health', (c) => c.json({ status: 'ok' }, 200));
