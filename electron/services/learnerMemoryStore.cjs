const {
  buildContextPacket,
  graphSnapshot,
  memoryInbox,
  rebuildMemoryGraph,
  recordMemoryEvent,
} = require('./memoryGraph.cjs');
const { MemoryStore: EncryptedMemoryStore, PACKAGE_FORMAT, PACKAGE_VERSION } = require('./memoryStore.cjs');

class MemoryStore extends EncryptedMemoryStore {
  async createLearner(payload) {
    const manifest = await super.createLearner(payload);
    await super.open(manifest.learnerId, payload.passphrase);
    try {
      const { db } = this.requireOpen(manifest.learnerId);
      this.transaction(db, () => rebuildMemoryGraph(db, manifest.learnerId));
      await this.persist(manifest.learnerId);
    } finally {
      this.close(manifest.learnerId);
    }
    return manifest;
  }

  async open(learnerId, passphrase) {
    await super.open(learnerId, passphrase);
    const { db } = this.requireOpen(learnerId);
    this.transaction(db, () => rebuildMemoryGraph(db, learnerId));
    await this.persist(learnerId);
    return this.dashboard(learnerId);
  }

  dashboard(learnerId) {
    const base = super.dashboard(learnerId);
    const { db } = this.requireOpen(learnerId);
    return {
      ...base,
      memoryInbox: memoryInbox(db, learnerId, true),
      memoryGraph: graphSnapshot(db, learnerId),
      contextPacket: buildContextPacket(db, learnerId, 'Continue the learner’s current lesson'),
    };
  }

  contextPacket(learnerId, objective = 'Current lesson') {
    const { db } = this.requireOpen(learnerId);
    return buildContextPacket(db, learnerId, objective);
  }

  memoryInbox(learnerId, includeArchived = true) {
    const { db } = this.requireOpen(learnerId);
    return memoryInbox(db, learnerId, includeArchived);
  }

  memoryGraph(learnerId) {
    const { db } = this.requireOpen(learnerId);
    return graphSnapshot(db, learnerId);
  }

  async completeSession(learnerId, sessionId, payload) {
    const { db } = this.requireOpen(learnerId);
    const before = new Map(
      this.queryAll(db, 'SELECT memory_id, evidence_count, active FROM memories WHERE learner_id = ?', [learnerId])
        .map((row) => [String(row.memory_id), row]),
    );

    await super.completeSession(learnerId, sessionId, payload);

    this.transaction(db, () => {
      const after = this.queryAll(db, 'SELECT * FROM memories WHERE learner_id = ?', [learnerId]);
      for (const row of after) {
        const previous = before.get(String(row.memory_id));
        if (!previous) {
          recordMemoryEvent(db, learnerId, {
            memoryId: row.memory_id,
            eventType: 'created',
            sourceSession: row.source_session || sessionId,
            details: { type: row.type, confidence: Number(row.confidence || 0) },
          });
        } else if (Number(previous.evidence_count || 0) !== Number(row.evidence_count || 0)) {
          recordMemoryEvent(db, learnerId, {
            memoryId: row.memory_id,
            eventType: 'reinforced',
            sourceSession: row.source_session || sessionId,
            details: {
              previousEvidenceCount: Number(previous.evidence_count || 0),
              evidenceCount: Number(row.evidence_count || 0),
              confidence: Number(row.confidence || 0),
              remainedArchived: Number(row.active) === 0,
            },
          });
        }
      }
      rebuildMemoryGraph(db, learnerId);
    });
    await this.persist(learnerId);
    return this.dashboard(learnerId);
  }

  async setMemoryActive(learnerId, memoryId, active) {
    const { db } = this.requireOpen(learnerId);
    const existing = this.queryOne(
      db,
      'SELECT memory_id, active, type, content FROM memories WHERE learner_id = ? AND memory_id = ?',
      [learnerId, memoryId],
    );
    if (!existing) throw new Error('Learner memory item was not found.');
    const target = active ? 1 : 0;
    if (Number(existing.active) !== target) {
      this.transaction(db, () => {
        db.run('UPDATE memories SET active = ?, last_confirmed = ? WHERE learner_id = ? AND memory_id = ?', [
          target,
          new Date().toISOString(),
          learnerId,
          memoryId,
        ]);
        if (db.getRowsModified() !== 1) throw new Error('Learner memory state could not be updated.');
        recordMemoryEvent(db, learnerId, {
          memoryId,
          eventType: active ? 'restored' : 'archived',
          details: { type: existing.type, content: existing.content },
        });
        rebuildMemoryGraph(db, learnerId);
      });
      await this.persist(learnerId);
    }
    return this.dashboard(learnerId);
  }

  async archiveMemory(learnerId, memoryId) {
    return this.setMemoryActive(learnerId, memoryId, false);
  }

  async restoreMemory(learnerId, memoryId) {
    return this.setMemoryActive(learnerId, memoryId, true);
  }
}

module.exports = { MemoryStore, PACKAGE_FORMAT, PACKAGE_VERSION };