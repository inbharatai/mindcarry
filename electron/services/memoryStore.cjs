const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const initSqlJs = require('sql.js');
const { encryptBuffer, decryptBuffer, sha256 } = require('./crypto.cjs');
const { SCHEMA_SQL } = require('./schema.cjs');

class MemoryStore {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.sessions = new Map();
    fs.mkdirSync(rootDir, { recursive: true });
  }

  async initialise() {
    if (!this.SQL) {
      const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
      this.SQL = await initSqlJs({ locateFile: () => wasmPath });
    }
  }

  validateLearnerId(learnerId) {
    if (typeof learnerId !== 'string' || !/^[a-f0-9-]{36}$/i.test(learnerId)) {
      throw new Error('Learner identifier is invalid.');
    }
    return learnerId;
  }

  learnerDir(learnerId) {
    return path.join(this.rootDir, this.validateLearnerId(learnerId));
  }

  manifestPath(learnerId) {
    return path.join(this.learnerDir(learnerId), 'manifest.json');
  }

  encryptedDbPath(learnerId) {
    return path.join(this.learnerDir(learnerId), 'learner.db.enc');
  }

  listLearners() {
    if (!fs.existsSync(this.rootDir)) return [];
    return fs
      .readdirSync(this.rootDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        try {
          return JSON.parse(fs.readFileSync(this.manifestPath(entry.name), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  async createLearner({ preferredName, age, language = 'English', interests = [], parentGoal = '', passphrase, consent }) {
    await this.initialise();
    const learnerId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const dir = this.learnerDir(learnerId);
    fs.mkdirSync(dir, { recursive: true });
    const db = new this.SQL.Database();
    db.run(SCHEMA_SQL);
    db.run(
      `INSERT INTO profile VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [learnerId, preferredName.trim(), Number(age), language, JSON.stringify(interests), parentGoal, createdAt, createdAt],
    );
    db.run(
      `INSERT INTO consent VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        learnerId,
        consent?.microphoneAllowed === false ? 0 : 1,
        consent?.cameraAllowed ? 1 : 0,
        consent?.localBehaviourAnalysisAllowed ? 1 : 0,
        consent?.transcriptStorageAllowed === false ? 0 : 1,
        consent?.rawAudioStorageAllowed ? 1 : 0,
        consent?.rawVideoStorageAllowed ? 1 : 0,
        '1.0',
        createdAt,
      ],
    );
    db.run(`INSERT INTO skills VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      'addition-within-20',
      'mathematics',
      'Addition within 20',
      0,
      'introduced',
      0,
      null,
      null,
    ]);
    const manifest = {
      schemaVersion: 1,
      learnerId,
      preferredName: preferredName.trim(),
      age: Number(age),
      language,
      createdAt,
      updatedAt: createdAt,
      encryption: 'aes-256-gcm+scrypt',
    };
    fs.writeFileSync(this.manifestPath(learnerId), JSON.stringify(manifest, null, 2));
    await this.saveDatabase(learnerId, db, passphrase);
    db.close();
    return manifest;
  }

  async open(learnerId, passphrase) {
    await this.initialise();
    const encrypted = fs.readFileSync(this.encryptedDbPath(learnerId));
    const plain = decryptBuffer(encrypted, passphrase, learnerId);
    const db = new this.SQL.Database(new Uint8Array(plain));
    this.sessions.set(learnerId, { db, passphrase, openedAt: Date.now() });
    return this.dashboard(learnerId);
  }

  close(learnerId) {
    const session = this.sessions.get(learnerId);
    if (session) session.db.close();
    this.sessions.delete(learnerId);
  }

  requireOpen(learnerId) {
    const session = this.sessions.get(learnerId);
    if (!session) throw new Error('Learner memory is locked.');
    return session;
  }

  async saveDatabase(learnerId, db, passphrase) {
    const bytes = Buffer.from(db.export());
    const encrypted = encryptBuffer(bytes, passphrase, learnerId);
    const target = this.encryptedDbPath(learnerId);
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, encrypted);
    fs.renameSync(temp, target);
    const manifest = JSON.parse(fs.readFileSync(this.manifestPath(learnerId), 'utf8'));
    manifest.updatedAt = new Date().toISOString();
    manifest.dbSha256 = sha256(encrypted);
    fs.writeFileSync(this.manifestPath(learnerId), JSON.stringify(manifest, null, 2));
  }

  async persist(learnerId) {
    const { db, passphrase } = this.requireOpen(learnerId);
    await this.saveDatabase(learnerId, db, passphrase);
  }

  queryOne(db, sql, params = []) {
    const statement = db.prepare(sql);
    statement.bind(params);
    const row = statement.step() ? statement.getAsObject() : null;
    statement.free();
    return row;
  }

  queryAll(db, sql, params = []) {
    const statement = db.prepare(sql);
    statement.bind(params);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    statement.free();
    return rows;
  }

  dashboard(learnerId) {
    const { db } = this.requireOpen(learnerId);
    const profile = this.queryOne(db, 'SELECT * FROM profile WHERE learner_id = ?', [learnerId]);
    const consent = this.queryOne(db, 'SELECT * FROM consent WHERE learner_id = ?', [learnerId]);
    const skills = this.queryAll(db, 'SELECT * FROM skills ORDER BY domain, name');
    const recentSessions = this.queryAll(db, 'SELECT * FROM sessions ORDER BY started_at DESC LIMIT 5');
    const memories = this.queryAll(db, 'SELECT * FROM memories ORDER BY last_confirmed DESC LIMIT 12');
    return {
      profile: {
        ...profile,
        interests: JSON.parse(profile?.interests_json || '[]'),
      },
      consent,
      skills,
      recentSessions,
      memories,
    };
  }

  async startSession(learnerId, objective = 'Practise addition within 20') {
    const { db } = this.requireOpen(learnerId);
    const sessionId = crypto.randomUUID();
    db.run('INSERT INTO sessions (session_id, learner_id, started_at, objective) VALUES (?, ?, ?, ?)', [
      sessionId,
      learnerId,
      new Date().toISOString(),
      objective,
    ]);
    await this.persist(learnerId);
    return { sessionId };
  }

  async recordAttempt(learnerId, data) {
    const { db } = this.requireOpen(learnerId);
    db.run(
      `INSERT INTO attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        data.sessionId,
        data.questionId,
        data.prompt,
        String(data.answerText),
        data.correct ? 1 : 0,
        data.independent ? 1 : 0,
        data.usedHint ? 1 : 0,
        Number(data.responseMs || 0),
        data.misconception || null,
        data.intervention || null,
        new Date().toISOString(),
      ],
    );
    await this.persist(learnerId);
  }

  async recordEngagement(learnerId, data) {
    const { db } = this.requireOpen(learnerId);
    db.run('INSERT INTO engagement_events VALUES (?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(),
      data.sessionId,
      Number(data.movementLevel || 0),
      data.responseLatencyMs == null ? null : Number(data.responseLatencyMs),
      data.cue || 'observable movement cue',
      new Date().toISOString(),
    ]);
    await this.persist(learnerId);
  }

  async completeSession(learnerId, sessionId, { summary, nextRecommendation, memories = [], mastery = 0 }) {
    const { db } = this.requireOpen(learnerId);
    const now = new Date().toISOString();
    db.run('UPDATE sessions SET ended_at = ?, summary = ?, next_recommendation = ? WHERE session_id = ?', [
      now,
      summary,
      nextRecommendation,
      sessionId,
    ]);
    db.run(
      `UPDATE skills SET mastery = ?, attempts = attempts + 1, last_practised = ?, status = ? WHERE skill_id = 'addition-within-20'`,
      [mastery, now, mastery >= 80 ? 'nearly mastered' : mastery >= 50 ? 'developing' : 'introduced'],
    );
    for (const memory of memories) {
      db.run('INSERT INTO memories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        crypto.randomUUID(),
        learnerId,
        memory.type,
        memory.content,
        Number(memory.confidence || 0.6),
        sessionId,
        now,
        now,
        memory.reviewAfter || null,
      ]);
    }
    await this.persist(learnerId);
    return this.dashboard(learnerId);
  }

  exportPackage(learnerId, destination) {
    const manifest = JSON.parse(fs.readFileSync(this.manifestPath(learnerId), 'utf8'));
    const encryptedDb = fs.readFileSync(this.encryptedDbPath(learnerId));
    const pkg = {
      format: 'mindcarry-childmind',
      version: 1,
      exportedAt: new Date().toISOString(),
      manifest,
      encryptedDatabase: encryptedDb.toString('base64'),
      checksum: sha256(encryptedDb),
    };
    fs.writeFileSync(destination, JSON.stringify(pkg));
    return destination;
  }

  async importPackage(source) {
    const pkg = JSON.parse(fs.readFileSync(source, 'utf8'));
    if (pkg.format !== 'mindcarry-childmind' || pkg.version !== 1) {
      throw new Error('Unsupported .childmind file.');
    }
    const encryptedDb = Buffer.from(pkg.encryptedDatabase, 'base64');
    if (sha256(encryptedDb) !== pkg.checksum) throw new Error('The .childmind file failed integrity verification.');
    const learnerId = this.validateLearnerId(pkg?.manifest?.learnerId);
    const dir = this.learnerDir(learnerId);
    if (fs.existsSync(dir)) {
      throw new Error('This learner already exists on this installation.');
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.manifestPath(learnerId), JSON.stringify(pkg.manifest, null, 2));
    fs.writeFileSync(this.encryptedDbPath(learnerId), encryptedDb);
    return pkg.manifest;
  }
}

module.exports = { MemoryStore };
