const fs = require('fs');
const path = require('path');
require('dotenv').config();

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `[generate-env] Brakuje zmiennych w .env: ${missing.join(', ')}. Skopiuj .env.example do .env i uzupełnij wartości.`,
  );
  process.exit(1);
}

const template = (production) => `export const environment = {
  production: ${production},
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseAnonKey: '${process.env.SUPABASE_ANON_KEY}',
};
`;

const outDir = path.join(__dirname, '..', 'src', 'environments');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'environment.ts'), template(false));
fs.writeFileSync(path.join(outDir, 'environment.development.ts'), template(false));
fs.writeFileSync(path.join(outDir, 'environment.prod.ts'), template(true));

console.log('[generate-env] Wygenerowano pliki src/environments z .env');
