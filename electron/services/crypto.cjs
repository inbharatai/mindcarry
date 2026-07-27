const crypto = require('node:crypto');

const VERSION = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function deriveKey(passphrase, salt) {
  if (typeof passphrase !== 'string' || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters.');
  }
  return crypto.scryptSync(passphrase, salt, KEY_BYTES, {
    N: 1 << 15,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024,
  });
}

function encryptBuffer(plainBuffer, passphrase, associatedData = '') {
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (associatedData) cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.from(
    JSON.stringify({
      version: VERSION,
      algorithm: 'aes-256-gcm+scrypt',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: ciphertext.toString('base64'),
    }),
    'utf8',
  );
}

function decryptBuffer(envelopeBuffer, passphrase, associatedData = '') {
  let envelope;
  try {
    envelope = JSON.parse(envelopeBuffer.toString('utf8'));
  } catch {
    throw new Error('Encrypted learner file is not valid JSON.');
  }
  if (envelope.version !== VERSION || envelope.algorithm !== 'aes-256-gcm+scrypt') {
    throw new Error('Unsupported encrypted learner file version.');
  }
  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const ciphertext = Buffer.from(envelope.data, 'base64');
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  if (associatedData) decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('Incorrect passphrase or corrupted learner memory.');
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { encryptBuffer, decryptBuffer, sha256, deriveKey };
