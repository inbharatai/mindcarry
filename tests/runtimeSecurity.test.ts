import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { assertUuid, secureStorageStatus, trustedRendererUrl } = require('../electron/services/runtimeSecurity.cjs');

const learnerId = '123e4567-e89b-42d3-a456-426614174000';

describe('runtime security helpers', () => {
  it('accepts UUIDs and rejects lookalike identifiers', () => {
    expect(assertUuid(learnerId, 'Learner ID')).toBe(learnerId);
    expect(() => assertUuid(`${learnerId}/../other`, 'Learner ID')).toThrow('Learner ID is invalid');
    expect(() => assertUuid('not-a-uuid', 'Learner ID')).toThrow('Learner ID is invalid');
  });

  it('trusts only the exact development origin', () => {
    const options = { devUrl: 'http://127.0.0.1:5173', productionFile: undefined };
    expect(trustedRendererUrl('http://127.0.0.1:5173/', options)).toBe(true);
    expect(trustedRendererUrl('http://127.0.0.1:5173/settings', options)).toBe(true);
    expect(trustedRendererUrl('http://127.0.0.1:51730/', options)).toBe(false);
    expect(trustedRendererUrl('http://127.0.0.1.evil.test:5173/', options)).toBe(false);
    expect(trustedRendererUrl('https://127.0.0.1:5173/', options)).toBe(false);
  });

  it('trusts only the packaged index file in production', () => {
    const productionFile = path.resolve('dist/index.html');
    const otherFile = path.resolve('dist/other.html');
    expect(trustedRendererUrl(pathToFileURL(productionFile).href, { productionFile })).toBe(true);
    expect(trustedRendererUrl(pathToFileURL(otherFile).href, { productionFile })).toBe(false);
    expect(trustedRendererUrl('https://example.com/', { productionFile })).toBe(false);
  });

  it('rejects unavailable and Linux basic_text secure storage', () => {
    expect(secureStorageStatus({ isEncryptionAvailable: () => false }, 'win32')).toEqual({
      available: false,
      backend: 'unavailable',
    });
    expect(secureStorageStatus({
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'basic_text',
    }, 'linux')).toEqual({ available: false, backend: 'basic_text' });
    expect(secureStorageStatus({
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'kwallet6',
    }, 'linux')).toEqual({ available: true, backend: 'kwallet6' });
    expect(secureStorageStatus({ isEncryptionAvailable: () => true }, 'win32')).toEqual({
      available: true,
      backend: 'dpapi',
    });
  });
});