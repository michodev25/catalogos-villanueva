import { createInterface } from 'node:readline/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const terminal = createInterface({ input: process.stdin, output: process.stdout });
const password = process.env.LOCAL_ADMIN_PASSWORD || await terminal.question('Contraseña para admin en desarrollo local: ');
terminal.close();
if (password.length < 6) throw new Error('Usa al menos seis caracteres para la prueba local.');
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
let content = existsSync('.env') ? readFileSync('.env', 'utf8') : 'DATA_MODE=local\nAPP_ORIGIN=http://127.0.0.1:4321\n';
content = content.replace(/^ADMIN_PASSWORD_HASH=.*\r?\n?/m, '');
writeFileSync('.env', `${content.trimEnd()}\nADMIN_PASSWORD_HASH=${salt}:${hash}\n`);
if (existsSync('.local/catalog.sqlite')) {
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync('.local/catalog.sqlite');
  database.exec('DELETE FROM sessions');
  database.close();
}
console.log('Acceso local configurado. Reinicia npm run dev si ya está ejecutándose.');
