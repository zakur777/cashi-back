import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string) {
	return readFileSync(join(repoRoot, path), "utf8");
}

async function collectBruFiles(directory: string): Promise<string[]> {
	const entries = await readdir(join(repoRoot, directory), {
		withFileTypes: true,
	});

	const nestedFiles = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = `${directory}/${entry.name}`;

			if (entry.isDirectory()) {
				return collectBruFiles(entryPath);
			}

			return entry.name.endsWith(".bru") ? [entryPath] : [];
		}),
	);

	return nestedFiles.flat();
}

describe("Render deployment readiness", () => {
	it("builds and starts from compiled output while preserving Prisma deploy migrations", () => {
		const packageJson = JSON.parse(readRepoFile("package.json")) as {
			scripts: Record<string, string>;
		};
		const buildConfig = JSON.parse(readRepoFile("tsconfig.build.json")) as {
			compilerOptions: Record<string, unknown>;
			include: string[];
			exclude: string[];
		};

		expect(packageJson.scripts.build).toBe("tsc -p tsconfig.build.json");
		expect(packageJson.scripts.start).toBe("node dist/index.js");
		expect(packageJson.scripts["prisma:migrate:deploy"]).toBe(
			"prisma migrate deploy",
		);
		expect(buildConfig.compilerOptions.outDir).toBe("dist");
		expect(buildConfig.compilerOptions.rootDir).toBe("src");
		expect(buildConfig.include).toEqual(["src/**/*.ts"]);
		expect(buildConfig.exclude).toContain("tests");
	});

	it("declares a secret-safe Render Blueprint with build, migration, and start commands", () => {
		const renderBlueprint = readRepoFile("render.yaml");

		expect(renderBlueprint).toContain("type: web");
		expect(renderBlueprint).toContain("runtime: node");
		expect(renderBlueprint).toContain("healthCheckPath: /health");
		expect(renderBlueprint).toContain("buildCommand: yarn install --frozen-lockfile --production=false && yarn prisma:generate && yarn build");
		expect(renderBlueprint).toContain("preDeployCommand: yarn prisma:migrate:deploy");
		expect(renderBlueprint).toContain("startCommand: yarn start");
		expect(renderBlueprint).toContain("key: NODE_ENV");
		expect(renderBlueprint).toContain("value: production");
		expect(renderBlueprint).toContain("fromDatabase:");
		expect(renderBlueprint).toContain("key: JWT_SECRET");
		expect(renderBlueprint).toContain("generateValue: true");
		expect(renderBlueprint).toContain("sync: false");
		expect(renderBlueprint).not.toContain("postgresql://");
		expect(renderBlueprint).not.toContain("change-me-use-a-long-random-string");
	});

	it("keeps Bruno production validation environment-driven without localhost request overrides", async () => {
		const productionEnvironment = readRepoFile(
			"bruno/environments/production.bru",
		);
		const bruFiles = await collectBruFiles("bruno");
		const filesWithLocalhostOverrides = bruFiles.filter((filePath) => {
			if (filePath === "bruno/environments/local.bru") {
				return false;
			}

			const content = readRepoFile(filePath);

			return content.includes("baseUrl: http://localhost");
		});

		expect(productionEnvironment).toContain("name: Production");
		expect(productionEnvironment).toContain("baseUrl: https://replace-with-render-url.onrender.com");
		expect(productionEnvironment).toContain("authToken: paste-production-login-token-here");
		expect(filesWithLocalhostOverrides).toEqual([]);
	});

	it("documents deployment validation and ignores local secret material", () => {
		const readme = readRepoFile("README.md");
		const gitignore = readRepoFile(".gitignore");

		expect(readme).toContain("Despliegue productivo en Render");
		expect(readme).toContain("URL productiva de la API: `https://replace-with-render-url.onrender.com`");
		expect(readme).toContain("yarn prisma:migrate:deploy");
		expect(readme).toContain("curl.exe \"$env:RENDER_URL/health\"");
		expect(readme).toContain("Flujo de validación Bruno Production");
		expect(readme).toContain("Declaración de uso de IA");
		expect(gitignore).toContain(".env.*");
		expect(gitignore).toContain("!.env.example");
		expect(gitignore).toContain("bruno/environments/*.local.bru");
		expect(gitignore).toContain("bruno/environments/*.private.bru");
	});
});
