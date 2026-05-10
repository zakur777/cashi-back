import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const readmePath = resolve(root, 'README.md');
if (!existsSync(readmePath)) {
  console.error('❌ Missing README.md');
  process.exit(1);
}

const readme = readFileSync(readmePath, 'utf-8');

const requiredReadmeSections = [
  '## Setup (Yarn + Corepack)',
  '## Base de datos (Docker Compose)',
  '## Prisma',
  '## Ejecutar API',
  '## Testing',
  '## Cliente Bruno'
];

const missingSections = requiredReadmeSections.filter((section) => !readme.includes(section));

if (missingSections.length > 0) {
  console.error('❌ README is missing required onboarding sections:');
  for (const section of missingSections) {
    console.error(`- ${section}`);
  }
  process.exit(1);
}

const requiredBrunoFiles = [
  'bruno/bruno.json',
  'bruno/environments/local.bru',
  'bruno/health/get-health.bru',
  'bruno/categories/list-categories.bru',
  'bruno/transactions/get-balance.bru'
];

const missingBrunoFiles = requiredBrunoFiles.filter((file) => !existsSync(resolve(root, file)));

if (missingBrunoFiles.length > 0) {
  console.error('❌ Missing required Bruno collection files:');
  for (const file of missingBrunoFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('✅ Onboarding/docs verification passed.');
console.log('   README sections and Bruno collection files are present.');
