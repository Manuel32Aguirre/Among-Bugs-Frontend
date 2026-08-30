import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const production = process.argv.includes('--production');

function loadEnv(path) {
  const vars = {};
  if (!existsSync(path)) {
    return vars;
  }

  readFileSync(path, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      return;
    }
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  });

  return vars;
}

const env = loadEnv(envPath);
const apiBaseUrl = env.API_BASE_URL || process.env.API_BASE_URL;

if (!apiBaseUrl) {
  console.error('Falta API_BASE_URL.');
  console.error('Copia .env.example a .env y define tu URL del backend.');
  process.exit(1);
}

const content = `/**
 * AUTO-GENERADO desde .env — NO EDITAR.
 * Ejecuta: npm start  |  npm run build
 * Fuente: Among-Bugs-Frontend/.env → API_BASE_URL
 */
export const environment = {
  production: ${production},
  apiBaseUrl: '${apiBaseUrl.replace(/'/g, "\\'")}'
};
`;

const target = join(root, 'src/environments/environment.ts');
writeFileSync(target, content, 'utf8');

console.log(`Generado ${production ? 'production' : 'development'} → ${target}`);
console.log(`API_BASE_URL=${apiBaseUrl}`);
