const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const initSqlJs = require('sql.js');
const { decryptBuffer, encryptBuffer, safeHashEqual, sha256 } = require('./crypto.cjs');
const { masteryStatus } = require('./lessonEngine.cjs');
const { SCHEMA_SQL, SCHEMA_VERSION } = require('./schema.cjs');

const PACKAGE_FORMAT = 'mindcarry-childmind';
const PACKAGE_VERSION = 2;
const MAX_ENCRYPTED_DATABASE_BYTES = 256 * 1024 * 1024;
const MAX_IMPORT_BYTES = 384 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

function normaliseText(value, max, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, max);
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function validIsoOrNow(value) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function decodeBase64Strict(value, maximumBytes) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0) {
    throw new Error('The encrypted learner database encoding is invalid.');
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('The encrypted learner database encoding is invalid.');
  }
  const buffer = Buffer.from(value, 'base64');
  if (buffer.length === 0 || buffer.length > maximumBytes || buffer.toString('base64') !== value) {
    throw new Error('The encrypted learner database encoding is invalid.');
  }
  return buffer;
}

class MemoryStore {
  constructor(vault, catalog) {
    this.vault = vault;
    this.catalog = catalog;
    this.sessions = new Map();
    this.initialised = false;
    this.initialising = null;
  }

  async initialise() {
    if (this.initialised) return;
    if (this.initialising) return this.initialising;
    this.initialising = (async () => {
      this.vault.ensure();
      if (!this.SQL) {
        const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
        this.SQL = await initSqlJs({ locateFile: () => wasmPath });
      }
      await this.migrateLegacyManifests();
      this.initialised = true;
    })();
    try {
      await this.initialising;
    } finally {
      this.initialising = null;
    }
  }

  paths(learnerId) {
    return this.vault.learnerPaths(learnerId);
  }

  transaction(db, callback) {
    db.run('BEGIN IMMEDIATE');
    try {
      const result = callback();
      db.run('COMMIT');
      return result;
    } catch (error) {
      try {
        db.run('ROLLBACK');
      } catch {
        // Preserve the original error.
      }
      throw error;
    }
  }

  async migrateLegacyManifests() {
    const existing = new Map(this.catalog.list().map((entry) => [entry.learnerId, entry]));
    if (!fs.existsSync(this.vault.learnersDir)) return;
    for (const entry of fs.readdirSync(this.vault.learnersDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      let learnerId;
      try {
        learnerId = this.vault.validateLearnerId(entry.name);
      } catch {
        continue;
      }
      const paths = this.paths(learnerId);
      if (!fs.existsSync(paths.manifest) || !fs.existsSync(paths.database)) continue;
      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
      } catch {
        continue;
      }
      if (!existing.has(learnerId)) {
        const catalogueEntry = this.catalog.upsert({
          learnerId,
          preferredName: manifest.preferredName || 'Encrypted learner',
          age: Number.isInteger(manifest.age) ? manifest.age : null,
          language: manifest.language || null,
          createdAt: manifest.createdAt || new Date().toISOString(),
          updatedAt: manifest.updatedAt || manifest.createdAt || new Date().toISOString(),
          metadataState: manifest.preferredName ? 'verified' : 'locked',
        });
        existing.set(learnerId, catalogueEntry);
      }
      if (manifest.preferredName || manifest.age || manifest.language) {
        this.writeManifest(learnerId, {
          createdAt: manifest.createdAt,
          updatedAt: manifest.updatedAt,
          dbSha256: manifest.dbSha256 || sha256(fs.readFileSync(paths.database)),
          encryption: manifest.encryption || 'aes-256-gcm+scrypt',
        });
      }
    }
  }

  listLearners() {
    return this.catalog.list();
  }

  writeManifest(learnerId, values = {}) {
    const paths = this.vault.ensureLearnerStructure(learnerId);
    const now = new Date().toISOString();
    const existing = fs.existsSync(paths.manifest)
      ? (() => {
          try {
            return JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
          } catch {
            return {};
          }
        })()
      : {};
    const hash = values.dbSha256 || existing.dbSha256 || null;
    if (hash != null && !SHA256_PATTERN.test(String(hash))) throw new Error('Learner database checksum is invalid.');
    const manifest = {
      format: 'mindcarry-learner',
      formatVersion: 1,
      schemaVersion: SCHEMA_VERSION,
      learnerId: this.vault.validateLearnerId(learnerId),
      createdAt: validIsoOrNow(values.createdAt || existing.createdAt || now),
      updatedAt: validIsoOrNow(values.updatedAt || now),
      encryption: normaliseText(values.encryption || 'aes-256-gcm+scrypt', 80),
      dbSha256: hash,
      containsPersonalData: false,
    };
    this.vault.atomicWriteJson(paths.manifest, manifest);
    return manifest;
  }

  validateNewLearner({ preferredName, age, language, interests, parentGoal, passphrase }) {
    const name = normaliseText(preferredName, 80);
    if (!name) throw new Error('Child name is required.');
    const numericAge = Number(age);
    if (!Number.isInteger(numericAge) || numericAge < 4 || numericAge > 14) throw new Error('Age must be between 4 and 14.');
    if (typeof passphrase !== 'string' || passphrase.length < 12 || passphrase.length > 256) {
      throw new Error('Parent passphrase must contain 12 to 256 characters.');
    }
    return {
      preferredName: name,
      age: numericAge,
      language: normaliseText(language, 50, 'English'),
      interests: Array.isArray(interests)
        ? interests.map((item) => normaliseText(item, 50)).filter(Boolean).slice(0, 10)
        : [],
      parentGoal: normaliseText(parentGoal, 500),
      passphrase,
    };
  }

  async createLearner(payload) {
    await this.initialise();
    const validated = this.validateNewLearner(payload);
    const learnerId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const paths = this.vault.ensureLearnerStructure(learnerId);
    const db = new this.SQL.Database();
    try {
      db.run(SCHEMA_SQL);
      this.transaction(db, () => {
        db.run(
          `INSERT INTO profile (learner_id, preferred_name, age, preferred_language, interests_json, parent_goal, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            learnerId,
            validated.preferredName,
            validated.age,
            validated.language,
            JSON.stringify(validated.interests),
            validated.parentGoal,
            createdAt,
            createdAt,
          ],
        );
        db.run(
          `INSERT INTO consent (learner_id, microphone_allowed, camera_allowed, local_behaviour_analysis_allowed,
            transcript_storage_allowed, raw_audio_storage_allowed, raw_video_storage_allowed, consent_version, consented_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            learnerId,
            payload.consent?.microphoneAllowed === false ? 0 : 1,
            payload.consent?.cameraAllowed ? 1 : 0,
            payload.consent?.localBehaviourAnalysisAllowed ? 1 : 0,
            payload.consent?.transcriptStorageAllowed === false ? 0 : 1,
            0,
            0,
            '1.0',
            createdAt,
          ],
        );
        db.run(
          `INSERT INTO skills (skill_id, domain, name, mastery, status, attempts, last_practised, next_review)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ['addition-within-20', 'mathematics', 'Addition within 20', 0, 'introduced', 0, null, null],
        );
      });
      this.writeManifest(learnerId, { createdAt, updatedAt: createdAt });
      await this.saveDatabase(learnerId, db, validated.passphrase, { createBackup: false });
      const catalogueEntry = this.catalog.upsert({
        learnerId,
        preferredName: validated.preferredName,
        age: validated.age,
        language: validated.language,
        createdAt,
        updatedAt: createdAt,
        metadataState: 'verified',
      });
      db.close();
      return catalogueEntry;
    } catch (error) {
      try {
        db.close();
      } catch {
        // Best-effort cleanup.
      }
      this.vault.removeLearnerStructure(learnerId);
      throw error;
    } finally {
      if (fs.existsSync(paths.sessionCache)) {
        for (const file of fs.readdirSync(paths.sessionCache)) fs.rmSync(path.join(paths.sessionCache, file), { force: true });
      }
    }
  }

  tableColumns(db, table) {
    return new Set(this.queryAll(db, `PRAGMA table_info(${table})`).map((row) => String(row.name)));
  }

  migrateDatabase(db) {
    db.run(SCHEMA_SQL);
    const additions = [
      ['sessions', 'status', "TEXT NOT NULL DEFAULT 'active'"],
      ['attempts', 'reasoning_observation', 'TEXT'],
      ['attempts', 'provider', 'TEXT'],
      ['memories', 'evidence_count', 'INTEGER NOT NULL DEFAULT 1'],
      ['memories', 'active', 'INTEGER NOT NULL DEFAULT 1'],
    ];
    for (const [table, column, type] of additions) {
      if (!this.tableColumns(db, table).has(column)) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
    db.run('CREATE INDEX IF NOT EXISTS idx_memories_active ON memories(learner_id, active, last_confirmed)');
    db.run(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?)`, [String(SCHEMA_VERSION)]);
  }

  verifyDatabase(db, learnerId) {
    const integrity = this.queryOne(db, 'PRAGMA integrity_check');
    if (!integrity || String(Object.values(integrity)[0]).toLowerCase() !== 'ok') {
      throw new Error('Learner database failed integrity verification.');
    }
    const profiles = this.queryAll(db, 'SELECT learner_id FROM profile');
    if (profiles.length !== 1 || profiles[0].learner_id !== learnerId) {
      throw new Error('Learner database identity does not match its folder.');
    }
    const consent = this.queryOne(db, 'SELECT learner_id FROM consent WHERE learner_id = ?', [learnerId]);
    if (!consent) throw new Error('Learner database consent record is missing.');
  }

  async open(learnerId, passphrase) {
    await this.initialise();
    const paths = this.paths(learnerId);
    if (!fs.existsSync(paths.database)) throw new Error('Encrypted learner database is missing.');
    const encrypted = fs.readFileSync(paths.database);
    const plain = await decryptBuffer(encrypted, passphrase, learnerId);
    let db;
    try {
      db = new this.SQL.Database(new Uint8Array(plain));
    } finally {
      plain.fill(0);
    }
    try {
      this.migrateDatabase(db);
      this.verifyDatabase(db, learnerId);
      const previous = this.sessions.get(learnerId);
      if (previous) previous.db.close();
      this.sessions.set(learnerId, { db, passphrase, openedAt: Date.now() });
      const dashboard = this.dashboard(learnerId);
      this.catalog.upsert({
        learnerId,
        preferredName: dashboard.profile.preferred_name,
        age: Number(dashboard.profile.age),
        language: dashboard.profile.preferred_language,
        createdAt: dashboard.profile.created_at,
        updatedAt: dashboard.profile.updated_at,
        metadataState: 'verified',
      });
      await this.persist(learnerId);
      return dashboard;
    } catch (error) {
      this.sessions.delete(learnerId);
      db?.close();
      throw error;
    }
  }

  close(learnerId) {
    const session = this.sessions.get(learnerId);
    if (session) session.db.close();
    this.sessions.delete(learnerId);
  }

  closeAll() {
    for (const learnerId of [...this.sessions.keys()]) this.close(learnerId);
  }

  requireOpen(learnerId) {
    const session = this.sessions.get(learnerId);
    if (!session) throw new Error('Learner memory is locked.');
    return session;
  }

  async saveDatabase(learnerId, db, passphrase, { createBackup = true } = {}) {
    const paths = this.vault.ensureLearnerStructure(learnerId);
    const bytes = Buffer.from(db.export());
    let encrypted;
    try {
      encrypted = await encryptBuffer(bytes, passphrase, learnerId);
    } finally {
      bytes.fill(0);
    }
    if (createBackup) this.vault.backupFile(paths.database, paths.backups, 'learner-db', 5);
    this.vault.atomicWrite(paths.database, encrypted);
    this.writeManifest(learnerId, {
      updatedAt: new Date().toISOString(),
      dbSha256: sha256(encrypted),
      encryption: 'aes-256-gcm+scrypt',
    });
  }

  async persist(learnerId) {
    const { db, passphrase } = this.requireOpen(learnerId);
    await this.saveDatabase(learnerId, db, passphrase);
  }

  queryOne(db, sql, params = []) {
    const statement = db.prepare(sql);
    try {
      statement.bind(params);
      return statement.step() ? statement.getAsObject() : null;
    } finally {
      statement.free();
    }
  }

  queryAll(db, sql, params = []) {
    const statement = db.prepare(sql);
    const rows = [];
    try {
      statement.bind(params);
      while (statement.step()) rows.push(statement.getAsObject());
      return rows;
    } finally {
      statement.free();
    }
  }

  dashboard(learnerId) {
    const { db } = this.requireOpen(learnerId);
    const profile = this.queryOne(db, 'SELECT * FROM profile WHERE learner_id = ?', [learnerId]);
    const consent = this.queryOne(db, 'SELECT * FROM consent WHERE learner_id = ?', [learnerId]);
    if (!profile || !consent) throw new Error('Learner profile is incomplete.');
    const skills = this.queryAll(db, 'SELECT * FROM skills ORDER BY domain, name');
    const recentSessions = this.queryAll(
      db,
      `SELECT * FROM sessions WHERE status = 'completed' ORDER BY started_at DESC LIMIT 5`,
    );
    const memories = this.queryAll(
      db,
      'SELECT * FROM memories WHERE active = 1 ORDER BY last_confirmed DESC LIMIT 12',
    );
    return {
      profile: { ...profile, interests: safeJsonArray(profile.interests_json) },
      consent,
      skills,
      recentSessions,
      memories,
    };
  }

  sessionRecord(db, learnerId, sessionId) {
    if (typeof sessionId !== 'string' || !UUID_PATTERN.test(sessionId)) throw new Error('Lesson session identifier is invalid.');
    const session = this.queryOne(
      db,
      'SELECT * FROM sessions WHERE session_id = ? AND learner_id = ? LIMIT 1',
      [sessionId, learnerId],
    );
    if (!session) throw new Error('Lesson session was not found in this learner memory.');
    return session;
  }

  requireActiveSession(db, learnerId, sessionId) {
    const session = this.sessionRecord(db, learnerId, sessionId);
    if (session.status !== 'active') throw new Error('Lesson session is no longer active.');
    return session;
  }

  async startSession(learnerId, objective = 'Practise addition within 20') {
    const { db } = this.requireOpen(learnerId);
    const now = new Date().toISOString();
    const sessionId = crypto.randomUUID();
    this.transaction(db, () => {
      db.run(
        `UPDATE sessions SET ended_at = ?, status = 'interrupted',
         summary = COALESCE(summary, 'The previous lesson ended before completion.')
         WHERE learner_id = ? AND status = 'active'`,
        [now, learnerId],
      );
      db.run(
        `INSERT INTO sessions (session_id, learner_id, started_at, objective, status) VALUES (?, ?, ?, ?, 'active')`,
        [sessionId, learnerId, now, normaliseText(objective, 250, 'Current lesson')],
      );
    });
    await this.persist(learnerId);
    return { sessionId };
  }

  async recordAttempt(learnerId, data) {
    const { db } = this.requireOpen(learnerId);
    this.requireActiveSession(db, learnerId, data.sessionId);
    this.transaction(db, () => {
      db.run(
        `INSERT INTO attempts (
          attempt_id, session_id, question_id, prompt, answer_text, correct, independent, used_hint,
          response_ms, misconception, intervention, reasoning_observation, provider, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          data.sessionId,
          normaliseText(data.questionId, 100, 'unknown-question'),
          normaliseText(data.prompt, 500, 'Question'),
          normaliseText(data.answerText, 500),
          data.correct ? 1 : 0,
          data.independent ? 1 : 0,
          data.usedHint ? 1 : 0,
          Math.max(0, Math.min(30 * 60 * 1000, Number(data.responseMs || 0))),
          data.misconception ? normaliseText(data.misconception, 250) : null,
          data.intervention ? normaliseText(data.intervention, 100) : null,
          data.reasoningObservation ? normaliseText(data.reasoningObservation, 500) : null,
          normaliseText(data.provider, 80, 'deterministic'),
          new Date().toISOString(),
        ],
      );
    });
    await this.persist(learnerId);
  }

  async recordEngagement(learnerId, data) {
    const { db } = this.requireOpen(learnerId);
    this.requireActiveSession(db, learnerId, data.sessionId);
    const movement = Math.max(0, Math.min(1, Number(data.movementLevel || 0)));
    this.transaction(db, () => {
      db.run(
        `INSERT INTO engagement_events (event_id, session_id, movement_level, response_latency_ms, cue, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          data.sessionId,
          movement,
          data.responseLatencyMs == null ? null : Math.max(0, Math.min(30 * 60 * 1000, Number(data.responseLatencyMs))),
          normaliseText(data.cue, 250, 'Observable movement cue'),
          new Date().toISOString(),
        ],
      );
    });
    await this.persist(learnerId);
  }

  async completeSession(learnerId, sessionId, { summary, nextRecommendation, memories = [], mastery = 0 }) {
    const { db } = this.requireOpen(learnerId);
    this.requireActiveSession(db, learnerId, sessionId);
    const now = new Date().toISOString();
    const score = Math.max(0, Math.min(100, Math.round(Number(mastery) || 0)));

    this.transaction(db, () => {
      db.run(
        `UPDATE sessions SET ended_at = ?, summary = ?, next_recommendation = ?, status = 'completed'
         WHERE session_id = ? AND learner_id = ? AND status = 'active'`,
        [
          now,
          normaliseText(summary, 1000, 'Lesson completed.'),
          normaliseText(nextRecommendation, 500, 'Continue reviewing the current skill.'),
          sessionId,
          learnerId,
        ],
      );
      if (db.getRowsModified() !== 1) throw new Error('Lesson completion could not be recorded.');

      db.run(
        `UPDATE skills SET mastery = ?, attempts = attempts + 1, last_practised = ?, status = ?
         WHERE skill_id = 'addition-within-20'`,
        [score, now, masteryStatus(score)],
      );
      if (db.getRowsModified() !== 1) throw new Error('Skill progress record is missing.');

      for (const memory of Array.isArray(memories) ? memories.slice(0, 12) : []) {
        const type = normaliseText(memory.type, 50, 'observation');
        const content = normaliseText(memory.content, 500);
        if (!content) continue;
        const confidence = Math.max(0, Math.min(0.95, Number(memory.confidence || 0.6)));
        const existing = this.queryOne(
          db,
          'SELECT * FROM memories WHERE learner_id = ? AND type = ? AND content = ? LIMIT 1',
          [learnerId, type, content],
        );
        if (existing) {
          const evidenceCount = Number(existing.evidence_count || 1) + 1;
          const combinedConfidence = Math.min(
            0.95,
            (Number(existing.confidence) * Number(existing.evidence_count || 1) + confidence) / evidenceCount,
          );
          db.run(
            `UPDATE memories SET confidence = ?, evidence_count = ?, last_confirmed = ?, source_session = ?, review_after = ?
             WHERE memory_id = ?`,
            [
              combinedConfidence,
              evidenceCount,
              now,
              sessionId,
              memory.reviewAfter ? validIsoOrNow(memory.reviewAfter) : existing.review_after,
              existing.memory_id,
            ],
          );
        } else {
          db.run(
            `INSERT INTO memories (
              memory_id, learner_id, type, content, confidence, source_session, created_at,
              last_confirmed, review_after, evidence_count, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              crypto.randomUUID(),
              learnerId,
              type,
              content,
              confidence,
              sessionId,
              now,
              now,
              memory.reviewAfter ? validIsoOrNow(memory.reviewAfter) : null,
              1,
            ],
          );
        }
      }
      db.run('UPDATE profile SET updated_at = ? WHERE learner_id = ?', [now, learnerId]);
    });

    await this.persist(learnerId);
    const profile = this.queryOne(db, 'SELECT * FROM profile WHERE learner_id = ?', [learnerId]);
    this.catalog.upsert({
      learnerId,
      preferredName: profile.preferred_name,
      age: Number(profile.age),
      language: profile.preferred_language,
      createdAt: profile.created_at,
      updatedAt: now,
      metadataState: 'verified',
    });
    return this.dashboard(learnerId);
  }

  async cancelSession(learnerId, sessionId, summaryMessage = 'The lesson was ended by the family before completion.') {
    const { db } = this.requireOpen(learnerId);
    const session = this.sessionRecord(db, learnerId, sessionId);
    if (session.status !== 'active') return { ok: true, status: session.status };
    this.transaction(db, () => {
      db.run(
        `UPDATE sessions SET ended_at = ?, status = 'cancelled', summary = COALESCE(summary, ?)
         WHERE session_id = ? AND learner_id = ? AND status = 'active'`,
        [new Date().toISOString(), normaliseText(summaryMessage, 500), sessionId, learnerId],
      );
    });
    await this.persist(learnerId);
    return { ok: true, status: 'cancelled' };
  }

  defaultExportPath(learnerId) {
    const shortId = this.vault.validateLearnerId(learnerId).slice(0, 8);
    const date = new Date().toISOString().slice(0, 10);
    return path.join(this.vault.exportsDir, `MindCarry-Learner-${shortId}-${date}.childmind`);
  }

  exportPackage(learnerId, destination) {
    if (typeof destination !== 'string' || !path.isAbsolute(destination)) {
      throw new Error('Export destination must be an absolute path.');
    }
    const paths = this.paths(learnerId);
    const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    if (manifest.format !== 'mindcarry-learner' || manifest.learnerId !== learnerId) {
      throw new Error('Learner manifest is invalid.');
    }
    const encryptedDb = fs.readFileSync(paths.database);
    const checksum = sha256(encryptedDb);
    if (manifest.dbSha256 && !safeHashEqual(checksum, manifest.dbSha256)) {
      throw new Error('Encrypted learner database does not match its manifest.');
    }
    const packageData = {
      format: PACKAGE_FORMAT,
      version: PACKAGE_VERSION,
      exportedAt: new Date().toISOString(),
      manifest: {
        format: 'mindcarry-learner',
        formatVersion: 1,
        schemaVersion: Number(manifest.schemaVersion || SCHEMA_VERSION),
        learnerId,
        createdAt: validIsoOrNow(manifest.createdAt),
        updatedAt: validIsoOrNow(manifest.updatedAt),
        encryption: normaliseText(manifest.encryption, 80, 'aes-256-gcm+scrypt'),
        containsPersonalData: false,
      },
      encryptedDatabase: encryptedDb.toString('base64'),
      checksum,
    };
    this.vault.atomicWrite(destination, Buffer.from(JSON.stringify(packageData), 'utf8'));
    return destination;
  }

  validatePackage(packageData) {
    if (!packageData || typeof packageData !== 'object' || Array.isArray(packageData)) {
      throw new Error('The selected file is not a valid .childmind package.');
    }
    if (packageData.format !== PACKAGE_FORMAT || ![1, PACKAGE_VERSION].includes(Number(packageData.version))) {
      throw new Error('This .childmind package version is not supported.');
    }
    const manifest = packageData.manifest;
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      throw new Error('The .childmind learner manifest is missing.');
    }
    if (manifest.format !== 'mindcarry-learner' || Number(manifest.formatVersion) !== 1) {
      throw new Error('The .childmind learner manifest format is not supported.');
    }
    const schemaVersion = Number(manifest.schemaVersion || 1);
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > SCHEMA_VERSION) {
      throw new Error('The .childmind learner schema is newer than this MindCarry version.');
    }
    const learnerId = this.vault.validateLearnerId(manifest.learnerId);
    if (manifest.containsPersonalData !== false) {
      throw new Error('The .childmind technical manifest is invalid.');
    }
    if (!SHA256_PATTERN.test(String(packageData.checksum || ''))) {
      throw new Error('The .childmind checksum is invalid.');
    }
    const encryptedDb = decodeBase64Strict(packageData.encryptedDatabase, MAX_ENCRYPTED_DATABASE_BYTES);
    if (!safeHashEqual(sha256(encryptedDb), packageData.checksum)) {
      throw new Error('The .childmind package failed integrity verification.');
    }
    return {
      learnerId,
      encryptedDb,
      createdAt: validIsoOrNow(manifest.createdAt),
      updatedAt: validIsoOrNow(manifest.updatedAt),
      encryption: normaliseText(manifest.encryption, 80, 'aes-256-gcm+scrypt'),
    };
  }

  async importPackage(source) {
    const stats = fs.statSync(source);
    if (!stats.isFile() || stats.size < 100 || stats.size > MAX_IMPORT_BYTES) {
      throw new Error('The selected .childmind file has an invalid size.');
    }
    let packageData;
    try {
      packageData = JSON.parse(fs.readFileSync(source, 'utf8'));
    } catch {
      throw new Error('The selected file is not a valid .childmind package.');
    }
    const validated = this.validatePackage(packageData);
    const paths = this.paths(validated.learnerId);
    if (fs.existsSync(paths.root)) throw new Error('This learner already exists on this MindCarry installation.');
    try {
      this.vault.ensureLearnerStructure(validated.learnerId);
      this.vault.atomicWrite(paths.database, validated.encryptedDb);
      this.writeManifest(validated.learnerId, {
        createdAt: validated.createdAt,
        updatedAt: validated.updatedAt,
        dbSha256: sha256(validated.encryptedDb),
        encryption: validated.encryption,
      });
      return this.catalog.upsert({
        learnerId: validated.learnerId,
        preferredName: 'Imported learner',
        age: null,
        language: null,
        createdAt: validated.createdAt,
        updatedAt: validated.updatedAt,
        metadataState: 'locked',
      });
    } catch (error) {
      this.vault.removeLearnerStructure(validated.learnerId);
      throw error;
    } finally {
      validated.encryptedDb.fill(0);
    }
  }
}

module.exports = {
  MAX_ENCRYPTED_DATABASE_BYTES,
  MAX_IMPORT_BYTES,
  MemoryStore,
  PACKAGE_FORMAT,
  PACKAGE_VERSION,
  decodeBase64Strict,
};