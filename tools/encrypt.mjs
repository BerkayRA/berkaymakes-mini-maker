// Encrypt files for the app with the password it already uses (key from the salt in index.html).
//   LMM_PW='…' node tools/encrypt.mjs index.html gallery.json gallery.enc exporter.js exporter.enc
// Takes any number of "plain encrypted" pairs after index.html. The password is read from the LMM_PW
// environment variable and is never written anywhere. Keep the plain files out of the repository
// (gallery.json and exporter.js are in .gitignore).
import fs from 'fs';
import zlib from 'zlib';
const [html, ...pairs] = process.argv.slice(2);
const pw = process.env.LMM_PW;
if (!pw || !html || !pairs.length || pairs.length % 2) {
  console.error('usage: LMM_PW=… node tools/encrypt.mjs index.html PLAIN ENCRYPTED [PLAIN ENCRYPTED …]'); process.exit(1);
}
const {subtle} = globalThis.crypto, rand = n => globalThis.crypto.getRandomValues(new Uint8Array(n));
const m = fs.readFileSync(html, 'utf8').match(/const LOCK = (\{[^\n]*?\});/); if (!m) throw new Error('no LOCK in ' + html);
const LOCK = JSON.parse(m[1]), b = s => Uint8Array.from(Buffer.from(s, 'base64'));
const base = await subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt: b(LOCK.s), iterations: LOCK.i}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
try { await subtle.decrypt({name: 'AES-GCM', iv: b(LOCK.v)}, key, b(LOCK.c)); } catch (e) { console.error('wrong password for this index.html'); process.exit(1); }
for (let i = 0; i < pairs.length; i += 2) {
  const [src, out] = [pairs[i], pairs[i + 1]], iv = rand(12);
  const ct = new Uint8Array(await subtle.encrypt({name: 'AES-GCM', iv}, key, zlib.gzipSync(fs.readFileSync(src), {level: 9})));
  fs.writeFileSync(out, Buffer.concat([Buffer.from('LMM1'), Buffer.from(iv), Buffer.from(ct)]));
  console.log('wrote', out, ct.length + 16, 'bytes');
}
