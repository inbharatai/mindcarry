import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { VaultManager } = require('../electron/services/vaultManager.cjs');
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('automatic local vault', () => {
  it('creates the complete folder structure without parent action', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mindcarry-vault-'));
    temporaryRoots.push(root);
    const vault = new VaultManager(path.join(root, 'MindCarryVault'));
    const status = vault.ensure();

    expect(status.ready).toBe(true);
    expect(fs.existsSync(vault.learnersDir)).toBe(true);
    expect(fs.existsSync(vault.exportsDir)).toBe(true);
    expect(fs.existsSync(vault.backupsDir)).toBe(true);
    expect(fs.existsSync(vault.recoveryDir)).toBe(true);
  });

  it('creates isolated folders for one learner', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mindcarry-vault-'));
    temporaryRoots.push(root);
    const vault = new VaultManager(path.join(root, 'MindCarryVault'));
    vault.ensure();
    const paths = vault.ensureLearnerStructure('11111111-1111-4111-8111-111111111111');

    expect(fs.existsSync(paths.root)).toBe(true);
    expect(fs.existsSync(paths.backups)).toBe(true);
    expect(fs.existsSync(paths.media)).toBe(true);
    expect(fs.existsSync(paths.handwriting)).toBe(true);
    expect(fs.existsSync(paths.pronunciation)).toBe(true);
    expect(fs.existsSync(paths.sessionCache)).toBe(true);
  });

  it('writes atomically to an external destination directory', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mindcarry-vault-'));
    temporaryRoots.push(root);
    const vault = new VaultManager(path.join(root, 'MindCarryVault'));
    vault.ensure();
    const external = path.join(root, 'external', 'learner.childmind');
    vault.atomicWrite(external, Buffer.from('encrypted-package'));
    expect(fs.readFileSync(external, 'utf8')).toBe('encrypted-package');
  });
});
