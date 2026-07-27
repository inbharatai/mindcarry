import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { CatalogStore, sanitiseEntry } = require('../electron/services/catalogStore.cjs');
const { VaultManager } = require('../electron/services/vaultManager.cjs');
const roots: string[] = [];

function createCatalog() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mindcarry-catalog-'));
  roots.push(root);
  const vault = new VaultManager(path.join(root, 'vault'));
  vault.ensure();
  const deviceKey = Buffer.alloc(32, 5);
  const catalog = new CatalogStore({
    filePath: vault.catalogPath,
    getDeviceKey: () => Buffer.from(deviceKey),
    atomicWrite: (filePath: string, data: Buffer) => vault.atomicWrite(filePath, data),
  });
  return { catalog, vault };
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('encrypted learner catalogue', () => {
  it('round-trips a validated catalogue entry without plaintext leakage', () => {
    const { catalog, vault } = createCatalog();
    const entry = catalog.upsert({
      learnerId: '123e4567-e89b-42d3-a456-426614174000',
      preferredName: '  Aarav  ',
      age: 7,
      language: 'English',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      metadataState: 'verified',
    });

    expect(entry.preferredName).toBe('Aarav');
    expect(catalog.list()).toEqual([entry]);
    expect(fs.readFileSync(vault.catalogPath, 'utf8')).not.toContain('Aarav');
  });

  it('rejects invalid identifiers, ages and timestamp ordering', () => {
    expect(() => sanitiseEntry({ learnerId: 'bad', preferredName: 'A', age: 7 })).toThrow('identifier');
    expect(() => sanitiseEntry({
      learnerId: '123e4567-e89b-42d3-a456-426614174000',
      preferredName: 'A',
      age: 3,
    })).toThrow('age');
    expect(() => sanitiseEntry({
      learnerId: '123e4567-e89b-42d3-a456-426614174000',
      preferredName: 'A',
      age: 7,
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })).toThrow('timestamps');
  });

  it('fails closed when secure device storage is unavailable', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mindcarry-catalog-no-key-'));
    roots.push(root);
    const filePath = path.join(root, 'catalog.enc');
    fs.writeFileSync(filePath, 'encrypted-placeholder');
    const catalog = new CatalogStore({
      filePath,
      getDeviceKey: () => null,
      atomicWrite: () => undefined,
    });
    expect(() => catalog.list()).toThrow('Secure device storage is unavailable');
  });
});