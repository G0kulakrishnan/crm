import crypto from 'crypto';
import fs from 'fs';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync('instant_public_key.txt', publicKey);
fs.appendFileSync('.env', '\nINSTANT_AUTH_PRIVATE_KEY="' + privateKey.replace(/\n/g, '\\n') + '"\n');

console.log('Keys generated successfully. Check instant_public_key.txt and .env');
