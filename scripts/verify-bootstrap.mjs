import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'package.json',
  '.env.example',
  'docker-compose.yml',
  'prisma/schema.prisma',
  'prisma.config.ts',
  'src/index.ts',
  'src/routes/index.routes.ts'
];

const missingFiles = requiredFiles.filter((file) => !existsSync(resolve(root, file)));

if (missingFiles.length > 0) {
  console.error('❌ Missing required runtime bootstrap files:');
  for (const file of missingFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const readmePath = resolve(root, 'README.md');
if (!existsSync(readmePath)) {
  console.error('❌ Missing README.md');
  process.exit(1);
}

const readme = readFileSync(readmePath, 'utf-8');

const requiredReadmeCommands = [
  'docker compose up -d',
  'yarn prisma:generate',
  'yarn prisma:migrate:dev',
  'yarn dev'
];

const missingCommands = requiredReadmeCommands.filter((cmd) => !readme.includes(cmd));

if (missingCommands.length > 0) {
  console.error('❌ README is missing required bootstrap commands:');
  for (const cmd of missingCommands) {
    console.error(`- ${cmd}`);
  }
  process.exit(1);
}

console.log('✅ Runtime bootstrap verification passed.');
console.log('   Required files exist and README documents DB/API startup commands.');
