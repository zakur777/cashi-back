import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const readmePath = resolve(root, "README.md");
if (!existsSync(readmePath)) {
	console.error("❌ Missing README.md");
	process.exit(1);
}

const readme = readFileSync(readmePath, "utf-8");

const requiredReadmeSections = [
	"## Setup (Yarn + Corepack)",
	"## Base de datos (Docker Compose)",
	"## Prisma",
	"## Ejecutar API",
	"## Testing",
	"## Autenticación y autorización",
	"## Cloudflare R2 para comprobantes",
	"## Checklist de video demostrativo",
	"## Cliente Bruno",
	"## Declaración de uso de IA",
];

const missingSections = requiredReadmeSections.filter(
	(section) => !readme.includes(section),
);

if (missingSections.length > 0) {
	console.error("❌ README is missing required onboarding sections:");
	for (const section of missingSections) {
		console.error(`- ${section}`);
	}
	process.exit(1);
}

const requiredReadmeTerms = [
	"DATABASE_URL",
	"PORT",
	"JWT_SECRET",
	"R2_ACCOUNT_ID",
	"R2_ACCESS_KEY_ID",
	"R2_SECRET_ACCESS_KEY",
	"R2_BUCKET_NAME",
	"R2_PUBLIC_URL",
	"Cloudflare R2",
	"Authorization: Bearer {token}",
	"POST /auth/register",
	"POST /auth/login",
	"POST /transactions/upload",
	"receiptUrl",
	"src/middlewares/auth.middleware.ts",
	"ownership check",
	"register → login → copiar token → upload multipart `receipt` → crear transacción con `receiptUrl` → consultar balance",
	"asistentes de IA",
];

const missingTerms = requiredReadmeTerms.filter(
	(term) => !readme.includes(term),
);

if (missingTerms.length > 0) {
	console.error("❌ README is missing required auth/R2 documentation terms:");
	for (const term of missingTerms) {
		console.error(`- ${term}`);
	}
	process.exit(1);
}

const envExamplePath = resolve(root, ".env.example");
if (!existsSync(envExamplePath)) {
	console.error("❌ Missing .env.example");
	process.exit(1);
}

const envExample = readFileSync(envExamplePath, "utf-8");
const requiredEnvVars = [
	"DATABASE_URL",
	"PORT",
	"JWT_SECRET",
	"R2_ACCOUNT_ID",
	"R2_ACCESS_KEY_ID",
	"R2_SECRET_ACCESS_KEY",
	"R2_BUCKET_NAME",
	"R2_PUBLIC_URL",
];
const missingEnvVars = requiredEnvVars.filter(
	(name) => !envExample.includes(`${name}=`),
);

if (missingEnvVars.length > 0) {
	console.error("❌ .env.example is missing required variables:");
	for (const name of missingEnvVars) {
		console.error(`- ${name}`);
	}
	process.exit(1);
}

const forbiddenSecretExamples = ["real-secret", "sk_live_", "AKIA"];
const leakedExamples = forbiddenSecretExamples.filter(
	(value) => readme.includes(value) || envExample.includes(value),
);

if (leakedExamples.length > 0) {
	console.error("❌ Docs appear to include unsafe secret examples:");
	for (const value of leakedExamples) {
		console.error(`- ${value}`);
	}
	process.exit(1);
}

const requiredBrunoFiles = [
	"bruno/bruno.json",
	"bruno/environments/local.bru",
	"bruno/health/get-health.bru",
	"bruno/categories/list-categories.bru",
	"bruno/transactions/get-balance.bru",
];

const missingBrunoFiles = requiredBrunoFiles.filter(
	(file) => !existsSync(resolve(root, file)),
);

if (missingBrunoFiles.length > 0) {
	console.error("❌ Missing required Bruno collection files:");
	for (const file of missingBrunoFiles) {
		console.error(`- ${file}`);
	}
	process.exit(1);
}

console.log("✅ Onboarding/docs verification passed.");
console.log("   README sections and Bruno collection files are present.");
