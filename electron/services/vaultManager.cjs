const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const VAULT_VERSION = 1;
const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class VaultManager {
  constructor(rootDir) {
    if (typeof rootDir !== 'string' || !path.isAbsolute(rootDir)) {
      throw new Error('MindCarry vault path must be absolute.');
    }
    this.rootDir = path.resolve(rootDir);
    this.learnersDir = path.join(this.rootDir, 'learners');
    this.exportsDir = path.join(this.rootDir, 'exports');
    this.backupsDir = path.join(this.rootDir, 'backups');
    this.tempDir = path.join(this.rootDir, 'temp');
    this.recoveryDir = path.join(this.rootDir, 'recovery');
    this.catalogPath = path.join(this.rootDir, 'learner-catalog.enc');
    this.settingsPath = path.join(this.rootDir, 'settings.json');
    this.descriptorPath = path.join(this.rootDir, 'vault.json');
  }

  ensure() {
    for (const directory of [
      this.rootDir,
      this.learnersDir,
      this.exportsDir,
      this.backupsDir,
      this.tempDir,
      this.recoveryDir,
    ]) {
      this.ensureDirectory(directory);
    }

    if (!fs.existsSync(this.descriptorPath)) {
      this.atomicWriteJson(this.descriptorPath, {
        format: 'mindcarry-local-vault',
        version: VAULT_VERSION,
        createdAt: new Date().toISOString(),
        containsPersonalData: false,
        note: 'Learner records are stored in encrypted files inside the learners directory.',
      });
    }
    this.cleanStaleTempFiles();
    return this.status();
  }

  ensureDirectory(directory) {
    fs.mkdirSync(directory, { recursive: true, mode: DIRECTORY_MODE });
    try {
      fs.chmodSync(directory, DIRECTORY_MODE);
    } catch {
      // Windows ACLs are managed by the operating system. Encryption remains the primary control.
    }
  }

  validateLearnerId(learnerId) {
    if (typeof learnerId !== 'string' || !UUID_PATTERN.test(learnerId)) {
      throw new Error('Learner identifier is invalid.');
    }
    return learnerId;
  }

  learnerPaths(learnerId) {
    const id = this.validateLearnerId(learnerId);
    const root = path.join(this.learnersDir, id);
    return {
      root,
      manifest: path.join(root, 'manifest.json'),
      database: path.join(root, 'learner.db.enc'),
      backups: path.join(root, 'backups'),
      media: path.join(root, 'media'),
      handwriting: path.join(root, 'handwriting'),
      pronunciation: path.join(root, 'pronunciation'),
      sessionCache: path.join(root, 'session-cache'),
    };
  }

  ensureLearnerStructure(learnerId) {
    const paths = this.learnerPaths(learnerId);
    for (const directory of [
      paths.root,
      paths.backups,
      paths.media,
      paths.handwriting,
      paths.pronunciation,
      paths.sessionCache,
    ]) {
      this.ensureDirectory(directory);
    }
    return paths;
  }

  removeLearnerStructure(learnerId) {
    const { root } = this.learnerPaths(learnerId);
    if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
  }

  atomicWrite(filePath, data) {
    const resolved = path.resolve(filePath);
    this.ensureDirectory(path.dirname(resolved));
    const temporary = path.join(
      this.tempDir,
      `${path.basename(resolved)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`,
    );
    const descriptor = fs.openSync(temporary, 'w', FILE_MODE);
    try {
      fs.writeFileSync(descriptor, data);
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(temporary, resolved);
    try {
      fs.chmodSync(resolved, FILE_MODE);
    } catch {
      // See Windows ACL note in ensureDirectory.
    }
  }

  atomicWriteJson(filePath, value) {
    this.atomicWrite(filePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'));
  }

  backupFile(source, destinationDirectory, prefix, retain = 5) {
    if (!fs.existsSync(source)) return null;
    this.ensureDirectory(destinationDirectory);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(destinationDirectory, `${prefix}-${timestamp}.bak`);
    fs.copyFileSync(source, destination);
    try {
      fs.chmodSync(destination, FILE_MODE);
    } catch {
      // See Windows ACL note in ensureDirectory.
    }
    const backups = fs
      .readdirSync(destinationDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${prefix}-`))
      .map((entry) => ({ name: entry.name, time: fs.statSync(path.join(destinationDirectory, entry.name)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    for (const old of backups.slice(retain)) {
      fs.rmSync(path.join(destinationDirectory, old.name), { force: true });
    }
    return destination;
  }

  cleanStaleTempFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    if (!fs.existsSync(this.tempDir)) return;
    const now = Date.now();
    for (const entry of fs.readdirSync(this.tempDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const file = path.join(this.tempDir, entry.name);
      try {
        if (now - fs.statSync(file).mtimeMs > maxAgeMs) fs.rmSync(file, { force: true });
      } catch {
        // Cleanup is best effort and must not prevent MindCarry from starting.
      }
    }
  }

  status() {
    return {
      ready: fs.existsSync(this.rootDir) && fs.existsSync(this.learnersDir),
      root: this.rootDir,
      learners: this.learnersDir,
      exports: this.exportsDir,
      backups: this.backupsDir,
    };
  }
}

module.exports = { VaultManager, VAULT_VERSION };
