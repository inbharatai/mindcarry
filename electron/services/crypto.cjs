const crypto = require('node:crypto');

const ENVELOPE_VERSION = 2;
const LEGACY_VERSION = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAX_ENCRYPTED_BYTES = 256 * 1024 * 1024;
const KDF = Object.freeze({ N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });

function assertPassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 8 || passphrase.length > 256) {
    throw new Error('The parent passphrase is invalid.');
  }
}

function deriveKey(passphrase, salt, options = KDF) {
  assertPassphrase(passphrase);
  if (!Buffer.isBuffer(salt) || salt.length !== SALT_BYTES) {
    return Promise.reject(new Error('The encryption salt is invalid.'));
  }
  return new Promise((resolve, reject) => {
    crypto.scrypt(passphrase, salt, KEY_BYTES, options, (error, key) => {
      if (error) reject(new Error('Unable to derive the learner-memory key.'));
      else resolve(key);
    });
  });
}

function parseBase64(value, expectedLength, name, maximumLength = expectedLength) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is missing.`);
  const buffer = Buffer.from(value, 'base64');
  if (buffer.length < expectedLength || buffer.length > maximumLength) throw new Error(`${name} is invalid.`);
  return buffer;
}

function createEnvelope(ciphertext, salt, iv, tag, kdf) {
  return Buffer.from(
    JSON.stringify({
      version: ENVELOPE_VERSION,
      algorithm: 'aes-256-gcm',
      kdf: { name: 'scrypt', N: kdf.N, r: kdf.r, p: kdf.p, keyBytes: KEY_BYTES },
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: ciphertext.toString('base64'),
    }),
    'utf8',
  );
}

async function encryptBuffer(plainBuffer, passphrase, associatedData = '') {
  assertPassphrase(passphrase);
  const plain = Buffer.isBuffer(plainBuffer) ? plainBuffer : Buffer.from(plainBuffer);
  if (plain.length > MAX_ENCRYPTED_BYTES) throw new Error('Learner memory is too large to encrypt safely.');
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = await deriveKey(passphrase, salt);
  try {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    if (associatedData) cipher.setAAD(Buffer.from(associatedData, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    return createEnvelope(ciphertext, salt, iv, cipher.getAuthTag(), KDF);
  } finally {
    key.fill(0);
  }
}

function readEnvelope(envelopeBuffer) {
  if (!Buffer.isBuffer(envelopeBuffer) || envelopeBuffer.length > MAX_ENCRYPTED_BYTES * 2) {
    throw new Error('Encrypted learner memory has an invalid size.');
  }
  try {
    return JSON.parse(envelopeBuffer.toString('utf8'));
  } catch {
    throw new Error('Encrypted learner memory is not a valid MindCarry envelope.');
  }
}

async function decryptBuffer(envelopeBuffer, passphrase, associatedData = '') {
  const envelope = readEnvelope(envelopeBuffer);
  if (![LEGACY_VERSION, ENVELOPE_VERSION].includes(envelope.version)) {
    throw new Error('This learner-memory encryption version is not supported.');
  }
  const isLegacy = envelope.version === LEGACY_VERSION;
  const algorithmValid = isLegacy
    ? envelope.algorithm === 'aes-256-gcm+scrypt'
    : envelope.algorithm === 'aes-256-gcm' && envelope.kdf?.name === 'scrypt';
  if (!algorithmValid) throw new Error('The learner-memory encryption algorithm is not supported.');

  const salt = parseBase64(envelope.salt, SALT_BYTES, 'Encryption salt');
  const iv = parseBase64(envelope.iv, IV_BYTES, 'Encryption IV');
  const tag = parseBase64(envelope.tag, TAG_BYTES, 'Authentication tag');
  const ciphertext = parseBase64(envelope.data, 0, 'Encrypted payload', MAX_ENCRYPTED_BYTES);
  const options = isLegacy
    ? KDF
    : {
        N: Number(envelope.kdf.N),
        r: Number(envelope.kdf.r),
        p: Number(envelope.kdf.p),
        maxmem: 128 * 1024 * 1024,
      };
  if (options.N !== KDF.N || options.r !== KDF.r || options.p !== KDF.p) {
    throw new Error('The learner-memory key settings are not supported.');
  }

  const key = await deriveKey(passphrase, salt, options);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    if (associatedData) decipher.setAAD(Buffer.from(associatedData, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('Incorrect passphrase or corrupted learner memory.');
  } finally {
    key.fill(0);
  }
}

function assertRawKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) throw new Error('Device encryption key is invalid.');
}

function encryptWithKey(plainBuffer, key, associatedData = '') {
  assertRawKey(key);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (associatedData) cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plainBuffer)), cipher.final()]);
  return Buffer.from(
    JSON.stringify({
      version: 1,
      algorithm: 'aes-256-gcm-device-key',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: ciphertext.toString('base64'),
    }),
    'utf8',
  );
}

function decryptWithKey(envelopeBuffer, key, associatedData = '') {
  assertRawKey(key);
  const envelope = readEnvelope(envelopeBuffer);
  if (envelope.version !== 1 || envelope.algorithm !== 'aes-256-gcm-device-key') {
    throw new Error('Encrypted device catalogue format is not supported.');
  }
  const iv = parseBase64(envelope.iv, IV_BYTES, 'Catalogue IV');
  const tag = parseBase64(envelope.tag, TAG_BYTES, 'Catalogue authentication tag');
  const data = parseBase64(envelope.data, 0, 'Catalogue payload', 8 * 1024 * 1024);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  if (associatedData) decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(data), decipher.final()]);
  } catch {
    throw new Error('The local learner catalogue is corrupted or belongs to another device.');
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function safeHashEqual(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  const a = Buffer.from(first, 'utf8');
  const b = Buffer.from(second, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  decryptBuffer,
  decryptWithKey,
  deriveKey,
  encryptBuffer,
  encryptWithKey,
  safeHashEqual,
  sha256,
};
