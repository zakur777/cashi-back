type ReadinessDatabaseCheck =
	| "skipped"
	| "unconfigured"
	| "invalid"
	| "reachable"
	| "unreachable";

export interface ProductionReadinessResult {
	ok: boolean;
	status: "ok" | "unhealthy";
	checks: {
		database: ReadinessDatabaseCheck;
	};
	error?: string;
}

type RuntimeEnv = Partial<Pick<NodeJS.ProcessEnv, "DATABASE_URL" | "NODE_ENV">>;
type DatabaseProbe = () => Promise<void>;

function unhealthy(
	database: ReadinessDatabaseCheck,
	error: string,
): ProductionReadinessResult {
	return {
		ok: false,
		status: "unhealthy",
		checks: { database },
		error,
	};
}

function hasPostgresProtocol(databaseUrl: string): boolean {
	try {
		const parsedUrl = new URL(databaseUrl);

		return parsedUrl.protocol === "postgres:" || parsedUrl.protocol === "postgresql:";
	} catch {
		return false;
	}
}

export async function getProductionReadiness(
	env: RuntimeEnv = process.env,
	probeDatabase: DatabaseProbe = async () => undefined,
): Promise<ProductionReadinessResult> {
	if (env.NODE_ENV !== "production") {
		return {
			ok: true,
			status: "ok",
			checks: { database: "skipped" },
		};
	}

	if (!env.DATABASE_URL) {
		return unhealthy("unconfigured", "DATABASE_URL is required in production.");
	}

	if (!hasPostgresProtocol(env.DATABASE_URL)) {
		return unhealthy(
			"invalid",
			"DATABASE_URL must use the postgres:// or postgresql:// protocol in production.",
		);
	}

	try {
		await probeDatabase();

		return {
			ok: true,
			status: "ok",
			checks: { database: "reachable" },
		};
	} catch {
		return unhealthy("unreachable", "Production database readiness check failed.");
	}
}
