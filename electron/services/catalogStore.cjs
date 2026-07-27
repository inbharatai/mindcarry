const fs = require('node:fs');
const { decryptWithKey, encryptWithKey } = require('./crypto.cjs');

const CATALOG_AAD = 'mindcarry-device-catalog-v1';

function sanitiseEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('Learner catalogue entry is invalid.');
  return {
    learnerId: String(entry.learnerId),
    preferredName: String(entry.preferredName || 'Encrypted learner').slice(0, 80),
    age: Number.isInteger(entry.age) ? entry.age : null,
    language: typeof entry.language === 'string' ? entry.language.slice(0, 50) : null,
    createdAt: String(entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
    metadataState: entry.metadataState === 'verified' ? 'verified' : 'locked',
  };
}

class CatalogStore {
  constructor({ filePath, getDeviceKey, atomicWrite }) {
    this.filePath = filePath;
    this.getDeviceKey = getDeviceKey;
    this.atomicWrite = atomicWrite;
  }

  read() {
    const key = this.getDeviceKey();
    if (!key) throw new Error('Secure device storage is unavailable. MindCarry cannot open the learner catalogue safely.');
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const plain = decryptWithKey(fs.readFileSync(this.filePath), key, CATALOG_AAD);
      const parsed = JSON.parse(plain.toString('utf8'));
      if (!Array.isArray(parsed)) throw new Error('Catalogue data is invalid.');
      return parsed.map(sanitiseEntry);
    } finally {
      key.fill(0);
    }
  }

  write(entries) {
    const key = this.getDeviceKey();
    if (!key) throw new Error('Secure device storage is unavailable. MindCarry cannot protect learner names safely.');
    try {
      const normalised = entries.map(sanitiseEntry);
      const encrypted = encryptWithKey(Buffer.from(JSON.stringify(normalised), 'utf8'), key, CATALOG_AAD);
      this.atomicWrite(this.filePath, encrypted);
      return normalised;
    } finally {
      key.fill(0);
    }
  }

  list() {
    return this.read().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  upsert(entry) {
    const value = sanitiseEntry(entry);
    const entries = this.read();
    const index = entries.findIndex((item) => item.learnerId === value.learnerId);
    if (index >= 0) entries[index] = value;
    else entries.push(value);
    this.write(entries);
    return value;
  }

  remove(learnerId) {
    const entries = this.read().filter((item) => item.learnerId !== learnerId);
    this.write(entries);
  }
}

module.exports = { CatalogStore };
