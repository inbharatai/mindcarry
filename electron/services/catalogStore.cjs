const fs = require('node:fs');
const { decryptWithKey, encryptWithKey } = require('./crypto.cjs');

const CATALOG_AAD = 'mindcarry-device-catalog-v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CATALOG_ENTRIES = 500;

function isoTimestamp(value, name) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) throw new Error(`${name} is invalid.`);
  return date.toISOString();
}

function sanitiseEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Learner catalogue entry is invalid.');
  }
  const learnerId = String(entry.learnerId || '');
  if (!UUID_PATTERN.test(learnerId)) throw new Error('Learner catalogue identifier is invalid.');
  const preferredName = String(entry.preferredName || 'Encrypted learner').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!preferredName) throw new Error('Learner catalogue name is invalid.');
  const age = entry.age == null ? null : Number(entry.age);
  if (age != null && (!Number.isInteger(age) || age < 4 || age > 14)) {
    throw new Error('Learner catalogue age is invalid.');
  }
  const language = entry.language == null ? null : String(entry.language).replace(/\s+/g, ' ').trim().slice(0, 50);
  if (entry.language != null && !language) throw new Error('Learner catalogue language is invalid.');
  const createdAt = isoTimestamp(entry.createdAt || new Date().toISOString(), 'Learner catalogue creation time');
  const updatedAt = isoTimestamp(entry.updatedAt || createdAt, 'Learner catalogue update time');
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error('Learner catalogue timestamps are inconsistent.');
  return {
    learnerId,
    preferredName,
    age,
    language,
    createdAt,
    updatedAt,
    metadataState: entry.metadataState === 'verified' ? 'verified' : 'locked',
  };
}

class CatalogStore {
  constructor({ filePath, getDeviceKey, atomicWrite }) {
    if (typeof filePath !== 'string' || typeof getDeviceKey !== 'function' || typeof atomicWrite !== 'function') {
      throw new Error('Learner catalogue configuration is invalid.');
    }
    this.filePath = filePath;
    this.getDeviceKey = getDeviceKey;
    this.atomicWrite = atomicWrite;
  }

  read() {
    const key = this.getDeviceKey();
    if (!key) {
      if (!fs.existsSync(this.filePath)) return [];
      throw new Error('Secure device storage is unavailable. MindCarry cannot open the encrypted learner catalogue safely.');
    }
    let plain;
    try {
      if (!fs.existsSync(this.filePath)) return [];
      plain = decryptWithKey(fs.readFileSync(this.filePath), key, CATALOG_AAD);
      const parsed = JSON.parse(plain.toString('utf8'));
      if (!Array.isArray(parsed) || parsed.length > MAX_CATALOG_ENTRIES) throw new Error('Catalogue data is invalid.');
      const normalised = parsed.map(sanitiseEntry);
      if (new Set(normalised.map((entry) => entry.learnerId)).size !== normalised.length) {
        throw new Error('Learner catalogue contains duplicate identifiers.');
      }
      return normalised;
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('The local learner catalogue is corrupted.');
      throw error;
    } finally {
      plain?.fill(0);
      key.fill(0);
    }
  }

  write(entries) {
    if (!Array.isArray(entries) || entries.length > MAX_CATALOG_ENTRIES) throw new Error('Learner catalogue is too large.');
    const key = this.getDeviceKey();
    if (!key) throw new Error('Secure device storage is unavailable. MindCarry cannot protect learner names safely.');
    let serialised;
    try {
      const normalised = entries.map(sanitiseEntry);
      if (new Set(normalised.map((entry) => entry.learnerId)).size !== normalised.length) {
        throw new Error('Learner catalogue contains duplicate identifiers.');
      }
      serialised = Buffer.from(JSON.stringify(normalised), 'utf8');
      const encrypted = encryptWithKey(serialised, key, CATALOG_AAD);
      this.atomicWrite(this.filePath, encrypted);
      return normalised;
    } finally {
      serialised?.fill(0);
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
    if (typeof learnerId !== 'string' || !UUID_PATTERN.test(learnerId)) throw new Error('Learner identifier is invalid.');
    const entries = this.read().filter((item) => item.learnerId !== learnerId);
    this.write(entries);
  }
}

module.exports = { CATALOG_AAD, CatalogStore, MAX_CATALOG_ENTRIES, sanitiseEntry };