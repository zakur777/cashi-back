import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { getProductionReadiness } from '../lib/production-readiness.js';

export const indexRoutes = new Hono();

indexRoutes.get('/health', async (c) => {
	const readiness = await getProductionReadiness(process.env, async () => {
		await prisma.$queryRaw`SELECT 1`;
	});

	if (!readiness.ok) {
		return c.json(
			{
				status: readiness.status,
				checks: readiness.checks,
				error: readiness.error,
			},
			503,
		);
	}

	if (process.env.NODE_ENV === 'production') {
		return c.json(
			{
				status: readiness.status,
				checks: readiness.checks,
			},
			200,
		);
	}

	return c.json({ status: 'ok' }, 200);
});
