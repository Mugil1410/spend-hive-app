// Diagnose a SpendHive encrypted backup on your PC, outside the app.
// Usage: node scripts/check-backup.mjs "C:\path\to\spendhive-backup-....spendhivebackup"
// It asks for the password (nothing is sent anywhere). If decryption works, it writes the
// decrypted JSON next to the backup as <name>.decrypted.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { gcm } from '@noble/ciphers/aes.js';
import { argon2idAsync } from '@noble/hashes/argon2.js';
import { hexToBytes } from '@noble/ciphers/utils.js';

const file = process.argv[2];
if (!file) {
  console.log('Usage: node scripts/check-backup.mjs <backup file>');
  process.exit(1);
}

let raw = readFileSync(file, 'utf8');
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
let c;
try {
  c = JSON.parse(raw);
} catch {
  console.log('File is not JSON. First 120 chars:\n' + raw.slice(0, 120));
  process.exit(1);
}
console.log('container:', c.container, '| formatVersion:', c.formatVersion, '| createdAt:', c.createdAt);
console.log('kdf:', JSON.stringify({ ...c.kdf, saltHex: c.kdf?.saltHex?.slice(0, 8) + '…' }));
console.log('cipher:', JSON.stringify(c.cipher), '| payload length:', c.payloadB64?.length);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('Backup password: ');
rl.close();

const payload = Buffer.from(c.payloadB64, 'base64');
const ivLen = c.cipher.ivLength ?? 12;
const tagLen = c.cipher.tagLength ?? 16;

// Try the password as typed, plus common typing slips (trailing space, caps lock).
const candidates = [...new Set([password, password.trim(), swapCase(password), swapCase(password.trim())])];

for (const pw of candidates) {
  const key = await argon2idAsync(pw, hexToBytes(c.kdf.saltHex), { t: c.kdf.t, m: c.kdf.m, p: c.kdf.p, dkLen: 32 });
  const layouts = {
    'iv|ciphertext|tag': () => [payload.subarray(0, ivLen), payload.subarray(ivLen)],
    'ciphertext|tag|iv': () => [payload.subarray(payload.length - ivLen), payload.subarray(0, payload.length - ivLen)],
  };
  for (const [name, split] of Object.entries(layouts)) {
    try {
      const [iv, body] = split();
      const plain = Buffer.from(gcm(key, iv).decrypt(body)).toString('utf8');
      const data = JSON.parse(plain);
      const out = file.replace(/(\.[^.\\/]+)?$/, '.decrypted.json');
      writeFileSync(out, plain);
      const label = pw === password ? 'password as typed' : 'a variant of the password (trimmed / caps-lock)';
      console.log(`\nSUCCESS with ${label}, layout ${name}.`);
      console.log(`transactions: ${data.transactions?.length}, accounts: ${data.accounts?.length}`);
      console.log('Decrypted JSON written to:', out);
      process.exit(0);
    } catch {}
  }
}
console.log('\nFAILED: this password does not decrypt the file (tag length ' + tagLen + ').');
console.log('Either the password is different from the one used when the backup was made, or the file was altered.');

function swapCase(s) {
  return [...s].map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).join('');
}
