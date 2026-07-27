import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  decryptBuffer,
  decryptWithKey,
  encryptBuffer,
  encryptWithKey,
  parseBase64,
  readEnvelope,
} = require('../electron/services/crypto.cjs');

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

  it('rejects unsupported or non-canonical envelope fields', async () => {
    const encrypted = await encryptBuffer(Buffer.from('secret'), 'a-long-parent-passphrase', 'learner-123');
    const envelope = JSON.parse(encrypted.toString('utf8'));

    await expect(decryptBuffer(Buffer.from('[]'), 'a-long-parent-passphrase', 'learner-123')).rejects.toThrow(
      'valid MindCarry envelope',
    );

    const wrongKdf = { ...envelope, kdf: { ...envelope.kdf, N: 1024 } };
    await expect(
      decryptBuffer(Buffer.from(JSON.stringify(wrongKdf)), 'a-long-parent-passphrase', 'learner-123'),
    ).rejects.toThrow('key settings');

    const nonCanonical = { ...envelope, salt: `${envelope.salt}= ` };
    await expect(
      decryptBuffer(Buffer.from(JSON.stringify(nonCanonical)), 'a-long-parent-passphrase', 'learner-123'),
    ).rejects.toThrow('Encryption salt is invalid');
  });

  it('parses canonical base64 only', () => {
    expect(parseBase64(Buffer.from('abc').toString('base64'), 3, 'Value').toString()).toBe('abc');
    expect(() => parseBase64('YWJj\n', 3, 'Value')).toThrow('Value is invalid');
    expect(() => parseBase64('***=', 1, 'Value')).toThrow('Value is invalid');
  });

  it('rejects invalid raw envelope input', () => {
    expect(() => readEnvelope(Buffer.alloc(0))).toThrow('invalid size');
    expect(() => readEnvelope(Buffer.from('not-json'))).toThrow('valid MindCarry envelope');
  });

  it('encrypts the local catalogue with a device key', () => {
    const key = Buffer.alloc(32, 7);
    const encrypted = encryptWithKey(Buffer.from('[{"name":"Aarav"}]'), key, 'catalogue');
    const plain = decryptWithKey(encrypted, key, 'catalogue');
    expect(plain.toString()).toContain('Aarav');
  });
});