const { pathToFileURL } = require('node:url');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value, name = 'Identifier') {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

function trustedRendererUrl(url, { devUrl, productionFile }) {
  if (typeof url !== 'string' || !url) return false;
  let candidate;
  try {
    candidate = new URL(url);
  } catch {
    return false;
  }

  if (devUrl) {
    try {
      const trusted = new URL(devUrl);
      return (
        candidate.protocol === trusted.protocol &&
        candidate.hostname === trusted.hostname &&
        candidate.port === trusted.port
      );
    } catch {
      return false;
    }
  }

  if (!productionFile) return false;
  const trustedFile = new URL(pathToFileURL(productionFile).href);
  return candidate.protocol === 'file:' && decodeURIComponent(candidate.pathname) === decodeURIComponent(trustedFile.pathname);
}

function secureStorageStatus(safeStorage, platform = process.platform) {
  if (!safeStorage?.isEncryptionAvailable?.()) {
    return { available: false, backend: 'unavailable' };
  }

  if (platform === 'linux' && typeof safeStorage.getSelectedStorageBackend === 'function') {
    const backend = String(safeStorage.getSelectedStorageBackend() || 'unknown');
    if (backend === 'basic_text' || backend === 'unknown') {
      return { available: false, backend };
    }
    return { available: true, backend };
  }

  return { available: true, backend: platform === 'win32' ? 'dpapi' : platform === 'darwin' ? 'keychain' : 'os-protected' };
}

module.exports = { UUID_PATTERN, assertUuid, secureStorageStatus, trustedRendererUrl };