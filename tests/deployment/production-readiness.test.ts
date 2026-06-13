import { describe, expect, it } from "vitest";
import { getProductionReadiness } from "../../src/lib/production-readiness.js";

describe("production readiness", () => {
	it("skips database validation outside production", async () => {
		const result = await getProductionReadiness(
			{ NODE_ENV: "test" },
			async () => {
				throw new Error("The database probe should not run outside production.");
			},
		);

		expect(result).toEqual({
			ok: true,
			status: "ok",
			checks: { database: "skipped" },
		});
	});

	it("fails clearly when production DATABASE_URL is missing", async () => {
		const result = await getProductionReadiness({ NODE_ENV: "production" });

		expect(result).toEqual({
			ok: false,
			status: "unhealthy",
			checks: { database: "unconfigured" },
			error: "DATABASE_URL is required in production.",
		});
	});

	it("fails clearly when production DATABASE_URL is not a Postgres URL", async () => {
		const result = await getProductionReadiness({
			NODE_ENV: "production",
			DATABASE_URL: "file:./local.db",
		});

		expect(result).toEqual({
			ok: false,
			status: "unhealthy",
			checks: { database: "invalid" },
			error: "DATABASE_URL must use the postgres:// or postgresql:// protocol in production.",
		});
	});

	it("reports production database reachability from the probe result", async () => {
		const reachable = await getProductionReadiness(
			{
				NODE_ENV: "production",
				DATABASE_URL: "postgresql://user:pass@localhost:5432/cashi",
			},
			async () => undefined,
		);
		const unreachable = await getProductionReadiness(
			{
				NODE_ENV: "production",
				DATABASE_URL: "postgresql://user:pass@localhost:5432/cashi",
			},
			async () => {
				throw new Error("connection refused");
			},
		);

		expect(reachable).toEqual({
			ok: true,
			status: "ok",
			checks: { database: "reachable" },
		});
		expect(unreachable).toEqual({
			ok: false,
			status: "unhealthy",
			checks: { database: "unreachable" },
			error: "Production database readiness check failed.",
		});
	});
});
