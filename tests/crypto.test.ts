import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { decryptBuffer, decryptWithKey, encryptBuffer, encryptWithKey } = require('../electron/services/crypto.cjs');

describe('learner-memory encryption', () => {
  it('round-trips an authenticated learner database', async () => {
    const encrypted = await encryptBuffer(
      Buffer.from('private learner data'),
      'a-long-parent-passphrase',
      'learner-123',
    );
    const plain = await decryptBuffer(encrypted, 'a-long-parent-passphrase', 'learner-123');
    expect(plain.toString()).toBe('private learner data');
  });

  it('rejects a wrong passphrase and mismatched associated data', async () => {
    const encrypted = await encryptBuffer(Buffer.from('secret'), 'a-long-parent-passphrase', 'learner-123');
    await expect(decryptBuffer(encrypted, 'another-long-passphrase', 'learner-123')).rejects.toThrow();
    await expect(decryptBuffer(encrypted, 'a-long-parent-passphrase', 'learner-999')).rejects.toThrow();
  });

  it('rejects tampered encrypted data', async () => {
    const encrypted = await encryptBuffer(Buffer.from('secret'), 'a-long-parent-passphrase', 'learner-123');
    const envelope = JSON.parse(encrypted.toString('utf8'));
    envelope.data = `${envelope.data.slice(0, -4)}AAAA`;
    await expect(
      decryptBuffer(Buffer.from(JSON.stringify(envelope)), 'a-long-parent-passphrase', 'learner-123'),
    ).rejects.toThrow();
  });

  it('encrypts the local catalogue with a device key', () => {
    const key = Buffer.alloc(32, 7);
    const encrypted = encryptWithKey(Buffer.from('[{"name":"Aarav"}]'), key, 'catalogue');
    const plain = decryptWithKey(encrypted, key, 'catalogue');
    expect(plain.toString()).toContain('Aarav');
  });
});
